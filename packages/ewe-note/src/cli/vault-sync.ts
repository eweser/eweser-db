#!/usr/bin/env node
/* eslint-disable no-console -- CLI tool: console is the correct output mechanism */
/**
 * Vault Sync Daemon
 *
 * Watches an Obsidian vault folder and keeps it in sync with a local JSON
 * state file representing the EweserDB room snapshot. The daemon:
 *
 *   File system → State file: file changes → parse note → update state
 *   State file  → File system: state changes → write .md file to disk
 *
 * In a production setup, the state file would be replaced with a live
 * WebSocket connection to the Hocuspocus sync server.
 *
 * Usage:
 *   npx tsx packages/ewe-note/src/cli/vault-sync.ts \
 *     --vault /path/to/vault \
 *     --state ./vault-state.json \
 *     [--debounce 500]
 *
 * Architecture Note:
 *   This daemon represents the sync logic layer. The actual EweserDB Yjs
 *   integration would connect via the @hocuspocus/provider WebSocket instead
 *   of the state JSON file, but the debounce + conflict resolution logic is
 *   identical.
 */

import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile,
} from 'node:fs/promises';
import { watch, type FSWatcher } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, dirname, extname } from 'node:path';
import {
  parseFrontmatter,
  extractTags,
  extractWikiLinks,
} from '@eweser/shared';
import {
  Database,
  downloadFile,
  type DocumentWithoutBase,
  type FileAttachment,
  type GetDocuments,
  type Note,
  uploadFile,
} from '@eweser/db';
import {
  generateNoteId,
  inventoryVault,
  isAttachmentFilePath,
  processVaultFile,
  vaultFileToAttachmentBase,
} from './import-vault';
import type { ImportedNote } from './import-vault';
import { serializeFrontmatter } from '@eweser/shared';

// ---------------------------------------------------------------------------
// State file types
// ---------------------------------------------------------------------------

export interface VaultState {
  vaultName: string;
  vaultPath: string;
  lastSyncedAt: string;
  notes: Record<string, ImportedNote>; // noteId → note
}

export type VaultSyncMode =
  | {
      kind: 'inventory';
      vaultPath: string;
      vaultName: string;
    }
  | {
      kind: 'local-state-sync';
      vaultPath: string;
      vaultName: string;
      statePath: string;
      debounceMs: number;
    }
  | {
      kind: 'eweser-room-sync';
      vaultPath: string;
      vaultName: string;
      roomId: string;
      attachmentsRoomId: string;
      remoteSync: boolean;
      authServer?: string;
      token?: string;
      debounceMs: number;
    };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const IGNORED_DIRS = new Set(['.obsidian', '.trash', '.git', 'node_modules']);
const NOTE_EXTENSION = '.md';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shouldIgnore(relPath: string): boolean {
  const parts = relPath.split('/');
  return parts.some((p) => IGNORED_DIRS.has(p) || p.startsWith('.'));
}

async function listVaultNotePaths(
  vaultPath: string,
  currentDir = vaultPath
): Promise<string[]> {
  let entries: string[];
  try {
    entries = await readdir(currentDir);
  } catch {
    return [];
  }

  const relPaths: string[] = [];

  for (const entry of entries) {
    const fullPath = join(currentDir, entry);
    const relPath = relative(vaultPath, fullPath).replace(/\\/g, '/');

    if (shouldIgnore(relPath)) continue;

    let fileStat;
    try {
      fileStat = await stat(fullPath);
    } catch {
      continue;
    }

    if (fileStat.isDirectory()) {
      relPaths.push(...(await listVaultNotePaths(vaultPath, fullPath)));
      continue;
    }

    if (extname(relPath).toLowerCase() === NOTE_EXTENSION) {
      relPaths.push(relPath);
    }
  }

  relPaths.sort((a, b) => a.localeCompare(b));
  return relPaths;
}

async function listVaultAttachmentPaths(
  vaultPath: string,
  currentDir = vaultPath
): Promise<string[]> {
  let entries: string[];
  try {
    entries = await readdir(currentDir);
  } catch {
    return [];
  }

  const relPaths: string[] = [];

  for (const entry of entries) {
    const fullPath = join(currentDir, entry);
    const relPath = relative(vaultPath, fullPath).replace(/\\/g, '/');

    if (shouldIgnore(relPath)) continue;

    let fileStat;
    try {
      fileStat = await stat(fullPath);
    } catch {
      continue;
    }

    if (fileStat.isDirectory()) {
      relPaths.push(...(await listVaultAttachmentPaths(vaultPath, fullPath)));
      continue;
    }

    if (isAttachmentFilePath(relPath)) {
      relPaths.push(relPath);
    }
  }

  relPaths.sort((a, b) => a.localeCompare(b));
  return relPaths;
}

async function readState(statePath: string): Promise<VaultState | null> {
  try {
    const raw = await readFile(statePath, 'utf-8');
    return JSON.parse(raw) as VaultState;
  } catch {
    return null;
  }
}

async function writeState(statePath: string, state: VaultState): Promise<void> {
  await writeFile(statePath, JSON.stringify(state, null, 2), 'utf-8');
}

function createMemoryStorage(): Storage {
  const storage = new Map<string, string>();
  return {
    clear() {
      storage.clear();
    },
    getItem(key: string) {
      return storage.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(storage.keys())[index] ?? null;
    },
    removeItem(key: string) {
      storage.delete(key);
    },
    setItem(key: string, value: string) {
      storage.set(key, String(value));
    },
    get length() {
      return storage.size;
    },
  } as Storage;
}

type RemoteSyncReadyProvider = {
  synced?: boolean;
  on(
    event: 'synced' | 'authenticationFailed',
    callback: (payload: { state?: boolean; reason?: string }) => void
  ): void;
  off(
    event: 'synced' | 'authenticationFailed',
    callback: (payload: { state?: boolean; reason?: string }) => void
  ): void;
};

export async function waitForRemoteSyncProviderReady(
  provider: RemoteSyncReadyProvider | null | undefined,
  timeoutMs = 15000
): Promise<void> {
  if (!provider) {
    throw new Error('Remote sync provider is missing.');
  }

  if (provider.synced) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out waiting for remote sync provider.'));
    }, timeoutMs);

    const handleSynced = (payload: { state?: boolean }) => {
      if (!payload.state) {
        return;
      }
      cleanup();
      resolve();
    };

    const handleAuthenticationFailed = (payload: { reason?: string }) => {
      cleanup();
      reject(
        new Error(
          `Remote sync provider authentication failed${payload.reason ? `: ${payload.reason}` : '.'}`
        )
      );
    };

    const cleanup = () => {
      clearTimeout(timeout);
      provider.off('synced', handleSynced);
      provider.off('authenticationFailed', handleAuthenticationFailed);
    };

    provider.on('synced', handleSynced);
    provider.on('authenticationFailed', handleAuthenticationFailed);
  });
}

async function waitForRemoteRoomReady(
  room: { syncProvider?: RemoteSyncReadyProvider | null },
  timeoutMs = 15000
): Promise<void> {
  const start = Date.now();

  while (!room.syncProvider) {
    if (Date.now() - start >= timeoutMs) {
      throw new Error('Timed out waiting for remote sync provider.');
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const remainingMs = Math.max(1, timeoutMs - (Date.now() - start));
  await waitForRemoteSyncProviderReady(room.syncProvider, remainingMs);
}

async function ensureNodeIndexedDb(): Promise<void> {
  if (!('window' in globalThis)) {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { location: { search: '' } },
    });
  }
  if (!globalThis.indexedDB) {
    const fakeIndexedDb = await import('fake-indexeddb');
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      value: fakeIndexedDb.indexedDB,
    });
    Object.defineProperty(globalThis, 'IDBKeyRange', {
      configurable: true,
      value: fakeIndexedDb.IDBKeyRange,
    });
  }
}

async function getFileMtime(filePath: string): Promise<Date | null> {
  try {
    const s = await stat(filePath);
    return s.mtime;
  } catch {
    return null;
  }
}

async function fileHash(filePath: string): Promise<string> {
  return createHash('sha256')
    .update(await readFile(filePath))
    .digest('hex');
}

function hashMarkdown(markdown: string): string {
  return createHash('sha256').update(markdown).digest('hex');
}

function generateAttachmentId(baseId: string, sourcePath: string): string {
  return createHash('sha256')
    .update(`${baseId}:${sourcePath}`)
    .digest('hex')
    .slice(0, 16);
}

async function noteFromFile(
  filePath: string,
  vaultPath: string,
  vaultName: string
): Promise<ImportedNote> {
  const rawContent = await readFile(filePath, 'utf-8');
  const relPath = relative(vaultPath, filePath).replace(/\\/g, '/');
  const { frontmatter, content } = parseFrontmatter(rawContent);

  const tags = extractTags(content);
  const fmTags = frontmatter['tags'];
  if (Array.isArray(fmTags)) {
    for (const t of fmTags) {
      if (typeof t === 'string' && !tags.includes(t)) tags.push(t);
    }
  }

  const wikiLinks = extractWikiLinks(content);
  const aliases: string[] = [];
  const fmAliases = frontmatter['aliases'];
  if (Array.isArray(fmAliases)) {
    for (const a of fmAliases) {
      if (typeof a === 'string') aliases.push(a);
    }
  }

  return {
    _id: generateNoteId(vaultName, relPath),
    text: content,
    sourcePath: relPath,
    sourceVault: vaultName,
    frontmatter,
    aliases,
    tags,
    wikiLinks: wikiLinks.map(({ target, heading, alias, isEmbed }) => {
      const entry: {
        target: string;
        heading?: string;
        alias?: string;
        isEmbed: boolean;
      } = { target, isEmbed };
      if (heading !== undefined) entry.heading = heading;
      if (alias !== undefined) entry.alias = alias;
      return entry;
    }),
    attachmentRefs: [],
  };
}

function noteToMarkdown(note: ImportedNote): string {
  const frontmatter: Record<string, unknown> = { ...note.frontmatter };
  if (note.aliases.length > 0 && !frontmatter['aliases']) {
    frontmatter['aliases'] = note.aliases;
  }
  if (note.tags.length > 0 && !frontmatter['tags']) {
    frontmatter['tags'] = note.tags;
  }
  return serializeFrontmatter(frontmatter, note.text);
}

function noteFieldsFromImported(note: ImportedNote): DocumentWithoutBase<Note> {
  return {
    text: note.text,
    sourcePath: note.sourcePath,
    sourceVault: note.sourceVault,
    frontmatter: note.frontmatter,
    aliases: note.aliases,
    tags: note.tags,
  };
}

function noteToImported(note: Note): ImportedNote {
  return {
    _id: note._id,
    text: note.text,
    sourcePath: note.sourcePath ?? `${note._id}.md`,
    sourceVault: note.sourceVault ?? 'Ewe Note',
    frontmatter: note.frontmatter ?? {},
    aliases: note.aliases ?? [],
    tags: note.tags ?? [],
    wikiLinks: [],
    attachmentRefs: [],
  };
}

export function resolveVaultSyncMode(options: {
  vaultPath?: string;
  vaultName?: string;
  statePath?: string;
  roomId?: string;
  attachmentsRoomId?: string;
  authServer?: string;
  token?: string;
  debounceMs?: number;
  inventoryOnly?: boolean;
  localOnly?: boolean;
  offlineOnly?: boolean;
}): VaultSyncMode {
  const vaultPath = options.vaultPath?.trim();
  if (!vaultPath) {
    throw new Error('A vault path must be provided explicitly.');
  }

  const vaultName = options.vaultName?.trim() || 'My Vault';
  const inventoryOnly = options.inventoryOnly ?? false;
  const localOnly = options.localOnly ?? false;
  const offlineOnly = options.offlineOnly ?? false;
  const debounceMs = options.debounceMs ?? 500;

  if (inventoryOnly) {
    return { kind: 'inventory', vaultPath, vaultName };
  }

  const roomId = options.roomId?.trim();
  if (roomId) {
    const hasRemoteConfig = Boolean(
      options.authServer?.trim() && options.token?.trim()
    );
    if (!offlineOnly && !hasRemoteConfig) {
      throw new Error(
        'Room sync without --offline-only requires both --auth-url and --token.'
      );
    }

    return {
      kind: 'eweser-room-sync',
      vaultPath,
      vaultName,
      roomId,
      attachmentsRoomId:
        options.attachmentsRoomId?.trim() || `${roomId}-attachments`,
      remoteSync: !offlineOnly,
      authServer: options.authServer?.trim() || undefined,
      token: options.token?.trim() || undefined,
      debounceMs,
    };
  }

  if (!localOnly) {
    throw new Error(
      'Refusing to run vault sync without --inventory-only or --local-only. Real-vault sync is blocked until the destination is explicit.'
    );
  }

  const statePath = options.statePath?.trim();
  if (!statePath) {
    throw new Error(
      '--state is required when running --local-only vault sync.'
    );
  }

  return {
    kind: 'local-state-sync',
    vaultPath,
    vaultName,
    statePath,
    debounceMs,
  };
}

// ---------------------------------------------------------------------------
// Sync engine
// ---------------------------------------------------------------------------

export class VaultSyncEngine {
  private readonly vaultPath: string;
  private readonly vaultName: string;
  private readonly statePath: string;
  private readonly debounceMs: number;
  private state: VaultState;
  private watcher: FSWatcher | null = null;
  private pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private writing = new Set<string>(); // paths currently being written by us

  constructor(options: {
    vaultPath: string;
    vaultName: string;
    statePath: string;
    debounceMs?: number;
  }) {
    this.vaultPath = options.vaultPath;
    this.vaultName = options.vaultName;
    this.statePath = options.statePath;
    this.debounceMs = options.debounceMs ?? 500;
    this.state = {
      vaultName: this.vaultName,
      vaultPath: this.vaultPath,
      lastSyncedAt: new Date().toISOString(),
      notes: {},
    };
  }

  /**
   * Load existing state and start watching the vault.
   */
  async start(): Promise<void> {
    const existing = await readState(this.statePath);
    if (existing) {
      this.state = existing;
      console.log(
        `Loaded state: ${Object.keys(this.state.notes).length} notes`
      );
    }

    await this.bootstrapFromVault();

    this.watcher = watch(
      this.vaultPath,
      { recursive: true },
      (event, filename) => {
        if (!filename) return;
        const relPath = filename.replace(/\\/g, '/');
        if (shouldIgnore(relPath)) return;
        if (extname(relPath).toLowerCase() !== NOTE_EXTENSION) return;

        // Debounce per file
        const existing = this.pendingTimers.get(relPath);
        if (existing) clearTimeout(existing);
        const timer = setTimeout(() => {
          this.pendingTimers.delete(relPath);
          void this.onFileChange(relPath);
        }, this.debounceMs);
        this.pendingTimers.set(relPath, timer);
      }
    );

    console.log(`Watching vault: ${this.vaultPath}`);
  }

  private async bootstrapFromVault(): Promise<void> {
    const relPaths = await listVaultNotePaths(this.vaultPath);
    const nextNotes: Record<string, ImportedNote> = { ...this.state.notes };

    for (const relPath of relPaths) {
      const fullPath = join(this.vaultPath, relPath);
      try {
        const note = await noteFromFile(
          fullPath,
          this.vaultPath,
          this.vaultName
        );
        nextNotes[note._id] = note;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`Failed to bootstrap ${relPath}: ${msg}`);
      }
    }

    this.state.notes = nextNotes;
    this.state.lastSyncedAt = new Date().toISOString();
    await writeState(this.statePath, this.state);
    console.log(`Bootstrapped state from vault: ${relPaths.length} notes`);
  }

  /**
   * Stop watching and flush pending state.
   */
  async stop(): Promise<void> {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    // Cancel pending debounce timers
    for (const timer of this.pendingTimers.values()) {
      clearTimeout(timer);
    }
    this.pendingTimers.clear();
    await writeState(this.statePath, this.state);
    console.log('Sync daemon stopped.');
  }

  /**
   * Handle a file change from the file system.
   * File → State direction.
   */
  async onFileChange(relPath: string): Promise<void> {
    if (this.writing.has(relPath)) {
      // Skip changes we caused ourselves
      return;
    }

    const fullPath = join(this.vaultPath, relPath);
    const mtime = await getFileMtime(fullPath);

    if (!mtime) {
      // File deleted
      await this.onFileDelete(relPath);
      return;
    }

    try {
      const note = await noteFromFile(fullPath, this.vaultPath, this.vaultName);
      const existing = this.state.notes[note._id];

      if (existing) {
        // Compare content to avoid echo loop
        if (
          existing.text === note.text &&
          JSON.stringify(existing.frontmatter) ===
            JSON.stringify(note.frontmatter)
        ) {
          return;
        }
      }

      this.state.notes[note._id] = note;
      this.state.lastSyncedAt = new Date().toISOString();
      await writeState(this.statePath, this.state);

      console.log(`File → State: updated "${relPath}"`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`Failed to process ${relPath}: ${msg}`);
    }
  }

  /**
   * Handle a file deletion — soft delete the note in state.
   */
  async onFileDelete(relPath: string): Promise<void> {
    const noteId = generateNoteId(this.vaultName, relPath);
    const note = this.state.notes[noteId];
    if (!note) return;

    // Remove from state (could also set a _deleted flag for EweserDB integration)
    const { [noteId]: _removed, ...remainingNotes } = this.state.notes;
    this.state.notes = remainingNotes;
    this.state.lastSyncedAt = new Date().toISOString();
    await writeState(this.statePath, this.state);
    console.log(`File → State: deleted "${relPath}"`);
  }

  /**
   * Push a note from state to the file system.
   * State → File direction.
   */
  async writeNoteToFile(note: ImportedNote): Promise<void> {
    const fullPath = join(this.vaultPath, note.sourcePath);
    const content = noteToMarkdown(note);

    // Read existing to compare — avoid unnecessary writes
    let existing: string | null = null;
    try {
      existing = await readFile(fullPath, 'utf-8');
    } catch {
      // File doesn't exist yet
    }

    if (existing === content) return; // Nothing changed

    this.writing.add(note.sourcePath);
    try {
      await mkdir(dirname(fullPath), { recursive: true });
      await writeFile(fullPath, content, 'utf-8');
      console.log(`State → File: wrote "${note.sourcePath}"`);
    } finally {
      // Remove write guard after a brief delay (longer than OS event buffering)
      setTimeout(
        () => this.writing.delete(note.sourcePath),
        this.debounceMs * 2
      );
    }
  }
}

export class EweserRoomVaultSyncEngine {
  private readonly vaultPath: string;
  private readonly vaultName: string;
  private readonly roomId: string;
  private readonly attachmentsRoomId: string;
  private readonly remoteSync: boolean;
  private readonly authServer?: string;
  private readonly token?: string;
  private readonly debounceMs: number;
  private db: Database | null = null;
  private Notes: GetDocuments<Note> | null = null;
  private Attachments: GetDocuments<FileAttachment> | null = null;
  private watcher: FSWatcher | null = null;
  private pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private writing = new Set<string>();
  private roomChangeHandler:
    | Parameters<GetDocuments<Note>['onChange']>[0]
    | null = null;
  private attachmentChangeHandler:
    | Parameters<GetDocuments<FileAttachment>['onChange']>[0]
    | null = null;

  constructor(options: {
    vaultPath: string;
    vaultName: string;
    roomId: string;
    attachmentsRoomId?: string;
    remoteSync?: boolean;
    authServer?: string;
    token?: string;
    debounceMs?: number;
  }) {
    this.vaultPath = options.vaultPath;
    this.vaultName = options.vaultName;
    this.roomId = options.roomId;
    this.attachmentsRoomId =
      options.attachmentsRoomId ?? `${options.roomId}-attachments`;
    this.remoteSync = options.remoteSync ?? false;
    this.authServer = options.authServer;
    this.token = options.token;
    this.debounceMs = options.debounceMs ?? 500;
  }

  async start(): Promise<void> {
    await ensureNodeIndexedDb();

    this.db = new Database({
      ...(this.authServer ? { authServer: this.authServer } : {}),
      providers: this.remoteSync ? ['IndexedDB', 'Hocuspocus'] : ['IndexedDB'],
      localStoragePolyfill: globalThis.localStorage ?? createMemoryStorage(),
      initialRooms: [
        {
          id: this.roomId,
          name: this.vaultName,
          collectionKey: 'notes',
        },
        {
          id: this.attachmentsRoomId,
          name: `${this.vaultName} Attachments`,
          collectionKey: 'fileAttachments',
        },
      ],
    });
    if (this.token) {
      this.db.accessGrantToken = this.token;
    }

    let notesRoom = this.db.getRoom<Note>('notes', this.roomId);
    let attachmentsRoom = this.db.getRoom<FileAttachment>(
      'fileAttachments',
      this.attachmentsRoomId
    );

    if (this.remoteSync) {
      this.db.useSync = true;
      const synced = await this.db.syncRegistry();
      if (!synced) {
        throw new Error('Failed to sync registry for remote vault sync.');
      }

      const syncedNotesRoom = this.db.registry.find(
        (room) => room.id === this.roomId && room.collectionKey === 'notes'
      );
      const syncedAttachmentsRoom = this.db.registry.find(
        (room) =>
          room.id === this.attachmentsRoomId &&
          room.collectionKey === 'fileAttachments'
      );

      if (!syncedNotesRoom || !syncedAttachmentsRoom) {
        throw new Error(
          'Remote vault sync could not find both notes and attachment rooms after registry sync.'
        );
      }

      notesRoom = (await this.db.loadRoom(syncedNotesRoom, {
        loadRemote: true,
        awaitLoadRemote: true,
      })) as typeof notesRoom;
      attachmentsRoom = (await this.db.loadRoom(syncedAttachmentsRoom, {
        loadRemote: true,
        awaitLoadRemote: true,
      })) as typeof attachmentsRoom;

      await waitForRemoteRoomReady(notesRoom);
      await waitForRemoteRoomReady(attachmentsRoom);
    } else {
      await notesRoom.load({ loadRemote: false, awaitLoadRemote: false });
      await attachmentsRoom.load({
        loadRemote: false,
        awaitLoadRemote: false,
      });
    }

    const room = notesRoom;
    this.Notes = room.getDocuments();
    this.Attachments = attachmentsRoom.getDocuments();

    await this.bootstrapFromVault();
    await this.bootstrapAttachmentsFromVault();
    this.observeRoomChanges();
    this.observeAttachmentChanges();
    this.startWatcher();

    console.log(
      `Watching vault with Eweser room ${this.roomId}: ${this.vaultPath}`
    );
  }

  async stop(): Promise<void> {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    for (const timer of this.pendingTimers.values()) {
      clearTimeout(timer);
    }
    this.pendingTimers.clear();

    if (this.Notes && this.roomChangeHandler) {
      this.Notes.documents.unobserve(this.roomChangeHandler);
      this.roomChangeHandler = null;
    }
    if (this.Attachments && this.attachmentChangeHandler) {
      this.Attachments.documents.unobserve(this.attachmentChangeHandler);
      this.attachmentChangeHandler = null;
    }

    this.db?.getRoom<Note>('notes', this.roomId)?.disconnect();
    this.db
      ?.getRoom<FileAttachment>('fileAttachments', this.attachmentsRoomId)
      ?.disconnect();
    console.log('Eweser room sync daemon stopped.');
  }

  getNotes(): Note[] {
    return this.requireNotes().getUndeletedToArray();
  }

  getDocuments(): GetDocuments<Note> {
    return this.requireNotes();
  }

  getAttachments(): FileAttachment[] {
    return this.requireAttachments().getUndeletedToArray();
  }

  getAttachmentDocuments(): GetDocuments<FileAttachment> {
    return this.requireAttachments();
  }

  async onFileChange(relPath: string): Promise<void> {
    if (this.writing.has(relPath)) return;

    const fullPath = join(this.vaultPath, relPath);
    const mtime = await getFileMtime(fullPath);
    if (!mtime) {
      await this.onFileDelete(relPath);
      return;
    }

    await this.upsertFileIntoRoom(relPath, true);
  }

  async onAttachmentChange(relPath: string): Promise<void> {
    if (this.writing.has(relPath)) return;
    await this.upsertAttachmentIntoRoom(relPath, true);
  }

  async onAttachmentDelete(relPath: string): Promise<void> {
    const Attachments = this.requireAttachments();
    const attachmentId = generateAttachmentId(this.roomId, relPath);
    const attachment = Attachments.get(attachmentId);
    if (!attachment || attachment.sourcePath !== relPath) return;
    Attachments.delete(attachmentId);
    console.log(`File -> Eweser attachment room: deleted "${relPath}"`);
  }

  async onFileDelete(relPath: string): Promise<void> {
    const Notes = this.requireNotes();
    const noteId = generateNoteId(this.vaultName, relPath);
    const note = Notes.get(noteId);
    if (!note || note.sourcePath !== relPath) return;
    Notes.delete(noteId);
    console.log(`File -> Eweser room: deleted "${relPath}"`);
  }

  private requireNotes(): GetDocuments<Note> {
    if (!this.Notes) throw new Error('Eweser room sync has not started.');
    return this.Notes;
  }

  private requireAttachments(): GetDocuments<FileAttachment> {
    if (!this.Attachments) {
      throw new Error('Eweser attachment room sync has not started.');
    }
    return this.Attachments;
  }

  private async bootstrapFromVault(): Promise<void> {
    const relPaths = await listVaultNotePaths(this.vaultPath);
    for (const relPath of relPaths) {
      await this.upsertFileIntoRoom(relPath, false);
    }
    console.log(
      `Bootstrapped Eweser room from vault: ${relPaths.length} notes`
    );
  }

  private async bootstrapAttachmentsFromVault(): Promise<void> {
    const relPaths = await listVaultAttachmentPaths(this.vaultPath);
    for (const relPath of relPaths) {
      await this.upsertAttachmentIntoRoom(relPath, false);
    }
    console.log(
      `Bootstrapped Eweser attachment room from vault: ${relPaths.length} files`
    );
  }

  private async upsertFileIntoRoom(
    relPath: string,
    shouldLog: boolean
  ): Promise<void> {
    const Notes = this.requireNotes();
    const fullPath = join(this.vaultPath, relPath);
    const mtime = await getFileMtime(fullPath);
    const currentFileHash = await fileHash(fullPath);
    const imported = await noteFromFile(
      fullPath,
      this.vaultPath,
      this.vaultName
    );
    const existing =
      Notes.get(imported._id) ??
      (await this.findRenameCandidate(currentFileHash));

    if (existing) {
      if (await this.handleConflict(existing, imported, currentFileHash)) {
        return;
      }

      const sourceId = existing.vaultSync?.sourceId ?? existing._id;
      const updated = {
        ...existing,
        ...noteFieldsFromImported(imported),
        vaultSync: this.buildVaultSyncMetadata(
          sourceId,
          imported,
          currentFileHash,
          mtime
        ),
      };
      Notes.set(updated);
    } else {
      Notes.new(
        {
          ...noteFieldsFromImported(imported),
          vaultSync: this.buildVaultSyncMetadata(
            imported._id,
            imported,
            currentFileHash,
            mtime
          ),
        },
        imported._id
      );
    }

    if (shouldLog) {
      console.log(`File -> Eweser room: updated "${relPath}"`);
    }
  }

  private buildVaultSyncMetadata(
    sourceId: string,
    imported: ImportedNote,
    currentFileHash: string,
    mtime: Date | null
  ): NonNullable<Note['vaultSync']> {
    const markdown = noteToMarkdown(imported);
    return {
      sourceId,
      sourcePath: imported.sourcePath,
      sourceMtimeMs: mtime?.getTime(),
      lastFileHash: currentFileHash,
      lastEweserHash: hashMarkdown(markdown),
      lastSyncedAt: new Date().toISOString(),
    };
  }

  private async findRenameCandidate(
    currentFileHash: string
  ): Promise<Note | undefined> {
    const Notes = this.requireNotes();
    for (const note of Notes.getUndeletedToArray()) {
      if (note.vaultSync?.lastFileHash !== currentFileHash) continue;
      if (!note.sourcePath) continue;
      const existingPathMtime = await getFileMtime(
        join(this.vaultPath, note.sourcePath)
      );
      if (!existingPathMtime) {
        return note;
      }
    }
    return undefined;
  }

  private async handleConflict(
    existing: Note,
    imported: ImportedNote,
    currentFileHash: string
  ): Promise<boolean> {
    const sync = existing.vaultSync;
    if (!sync?.lastFileHash || !sync.lastEweserHash) return false;
    if (sync.lastFileHash === currentFileHash) return false;

    const existingMarkdown = noteToMarkdown(noteToImported(existing));
    if (hashMarkdown(existingMarkdown) === sync.lastEweserHash) {
      return false;
    }

    const conflictPath = this.buildConflictPath(imported.sourcePath);
    const conflictFullPath = join(this.vaultPath, conflictPath);
    const incomingContent = await readFile(
      join(this.vaultPath, imported.sourcePath),
      'utf-8'
    );

    await mkdir(dirname(conflictFullPath), { recursive: true });
    await writeFile(conflictFullPath, incomingContent, 'utf-8');
    await this.writeNoteToFile(existing);
    await this.upsertFileIntoRoom(conflictPath, false);

    console.log(
      `Conflict: kept Eweser room note and wrote filesystem copy "${conflictPath}"`
    );
    return true;
  }

  private buildConflictPath(sourcePath: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = extname(sourcePath);
    const dot = ext ? sourcePath.length - ext.length : sourcePath.length;
    return `${sourcePath.slice(0, dot)} (conflict ${timestamp})${ext || NOTE_EXTENSION}`;
  }

  private observeRoomChanges(): void {
    const Notes = this.requireNotes();
    this.roomChangeHandler = () => {
      for (const note of Notes.getUndeletedToArray()) {
        void this.writeNoteToFile(note);
      }
    };
    Notes.onChange(this.roomChangeHandler);
  }

  private async upsertAttachmentIntoRoom(
    relPath: string,
    shouldLog: boolean
  ): Promise<void> {
    const Attachments = this.requireAttachments();
    const fullPath = join(this.vaultPath, relPath);
    const file = await processVaultFile(fullPath, this.vaultPath);
    const attachmentId = generateAttachmentId(this.roomId, file.sourcePath);
    const existing = Attachments.get(attachmentId);
    let metadata = vaultFileToAttachmentBase(file, {
      baseId: this.roomId,
      sourceVault: this.vaultName,
    });

    if (this.remoteSync) {
      if (!this.db) {
        throw new Error(
          'Remote attachment upload requires an initialized database.'
        );
      }

      const uploaded = await uploadFile({
        db: this.db,
        file: await readFile(fullPath),
        metadata: {
          baseId: metadata.baseId,
          filename: metadata.filename,
          mimeType: metadata.mimeType,
          ...(metadata.parentNoteRefs
            ? { parentNoteRefs: metadata.parentNoteRefs }
            : {}),
          size: metadata.size,
          sourcePath: metadata.sourcePath,
          ...(metadata.sourceVault
            ? { sourceVault: metadata.sourceVault }
            : {}),
        },
        roomId: this.attachmentsRoomId,
      });
      metadata = {
        ...metadata,
        contentHash: uploaded.contentHash,
        localAvailability: 'unknown',
        localPath: undefined,
        remoteObjectKey: uploaded.remoteObjectKey,
        remoteProviderProfileId: uploaded.remoteProviderProfileId,
        size: uploaded.size,
      };
    }

    if (existing) {
      Attachments.set({ ...existing, ...metadata });
    } else {
      Attachments.new(metadata, attachmentId);
    }

    if (shouldLog) {
      console.log(`File -> Eweser attachment room: updated "${relPath}"`);
    }
  }

  private observeAttachmentChanges(): void {
    const Attachments = this.requireAttachments();
    this.attachmentChangeHandler = () => {
      for (const attachment of Attachments.getUndeletedToArray()) {
        void this.materializeAttachment(attachment);
      }
    };
    Attachments.onChange(this.attachmentChangeHandler);
  }

  private startWatcher(): void {
    this.watcher = watch(
      this.vaultPath,
      { recursive: true },
      (_event, filename) => {
        if (!filename) return;
        const relPath = filename.replace(/\\/g, '/');
        if (shouldIgnore(relPath)) return;

        const existing = this.pendingTimers.get(relPath);
        if (existing) clearTimeout(existing);
        const timer = setTimeout(() => {
          this.pendingTimers.delete(relPath);
          if (extname(relPath).toLowerCase() === NOTE_EXTENSION) {
            void this.onFileChange(relPath);
            return;
          }
          if (isAttachmentFilePath(relPath)) {
            void this.onAttachmentChange(relPath);
          }
        }, this.debounceMs);
        this.pendingTimers.set(relPath, timer);
      }
    );
  }

  private async writeNoteToFile(note: Note): Promise<void> {
    const imported = noteToImported(note);
    const fullPath = join(this.vaultPath, imported.sourcePath);
    const content = noteToMarkdown(imported);

    let existing: string | null = null;
    try {
      existing = await readFile(fullPath, 'utf-8');
    } catch {
      // File does not exist yet.
    }

    if (existing === content) return;

    this.writing.add(imported.sourcePath);
    try {
      await mkdir(dirname(fullPath), { recursive: true });
      await writeFile(fullPath, content, 'utf-8');
      console.log(`Eweser room -> File: wrote "${imported.sourcePath}"`);
    } finally {
      setTimeout(
        () => this.writing.delete(imported.sourcePath),
        this.debounceMs * 2
      );
    }
  }

  private async materializeAttachment(
    attachment: FileAttachment
  ): Promise<void> {
    const destination = join(this.vaultPath, attachment.sourcePath);
    const canCopyLocal =
      Boolean(attachment.localPath) && destination !== attachment.localPath;

    try {
      const existingHash = await fileHash(destination);
      if (existingHash === attachment.contentHash) return;
      const conflictPath = this.buildConflictPath(attachment.sourcePath);
      await mkdir(dirname(join(this.vaultPath, conflictPath)), {
        recursive: true,
      });
      await copyFile(destination, join(this.vaultPath, conflictPath));
    } catch {
      // Missing destination is fine; materialization will create it.
    }

    this.writing.add(attachment.sourcePath);
    try {
      await mkdir(dirname(destination), { recursive: true });

      if (canCopyLocal && attachment.localPath) {
        await copyFile(attachment.localPath, destination);
      } else if (this.remoteSync && this.db && attachment.remoteObjectKey) {
        const bytes = await downloadFile({
          attachment,
          db: this.db,
          roomId: this.attachmentsRoomId,
        });
        await writeFile(destination, bytes);
      } else {
        return;
      }

      console.log(
        `Eweser attachment room -> File: wrote "${attachment.sourcePath}"`
      );
    } finally {
      setTimeout(
        () => this.writing.delete(attachment.sourcePath),
        this.debounceMs * 2
      );
    }
  }
}

// ---------------------------------------------------------------------------
// CLI entry
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const getArg = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : undefined;
  };

  const vaultPath = getArg('--vault');
  const vaultName = getArg('--name');
  const statePath = getArg('--state');
  const roomId = getArg('--room');
  const attachmentsRoomId = getArg('--attachments-room');
  const authServer = getArg('--auth-url');
  const token = getArg('--token');
  const debounceMs = Number(getArg('--debounce') ?? '500');
  const inventoryOnly = args.includes('--inventory-only');
  const localOnly = args.includes('--local-only');
  const offlineOnly = args.includes('--offline-only');

  let mode: VaultSyncMode;
  try {
    mode = resolveVaultSyncMode({
      vaultPath,
      vaultName,
      statePath,
      roomId,
      attachmentsRoomId,
      authServer,
      token,
      debounceMs,
      inventoryOnly,
      localOnly,
      offlineOnly,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      [
        message,
        'Usage:',
        '  npx tsx vault-sync.ts --vault /path/to/vault --inventory-only',
        '  npx tsx vault-sync.ts --vault /path/to/vault --local-only --state ./vault-state.json [--name "Vault"] [--debounce 500]',
        '  npx tsx vault-sync.ts --vault /path/to/vault --room room-id --offline-only [--attachments-room attachments-room-id] [--name "Vault"] [--auth-url http://localhost:38101] [--token token]',
      ].join('\n')
    );
    process.exit(1);
  }

  if (mode.kind === 'inventory') {
    const report = await inventoryVault({
      vaultPath: mode.vaultPath,
      vaultName: mode.vaultName,
    });
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  if (mode.kind === 'eweser-room-sync') {
    const engine = new EweserRoomVaultSyncEngine({
      vaultPath: mode.vaultPath,
      vaultName: mode.vaultName,
      roomId: mode.roomId,
      attachmentsRoomId: mode.attachmentsRoomId,
      remoteSync: mode.remoteSync,
      authServer: mode.authServer,
      token: mode.token,
      debounceMs: mode.debounceMs,
    });
    await engine.start();

    const shutdown = async () => {
      console.log('\nShutting down...');
      await engine.stop();
      process.exit(0);
    };

    process.on('SIGINT', () => void shutdown());
    process.on('SIGTERM', () => void shutdown());
    return;
  }

  const engine = new VaultSyncEngine({
    vaultPath: mode.vaultPath,
    vaultName: mode.vaultName,
    statePath: mode.statePath,
    debounceMs: mode.debounceMs,
  });
  await engine.start();

  const shutdown = async () => {
    console.log('\nShutting down...');
    await engine.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

if (process.argv[1] && process.argv[1].endsWith('vault-sync.ts')) {
  main().catch((err) => {
    console.error('Sync daemon failed:', err);
    process.exit(1);
  });
}
