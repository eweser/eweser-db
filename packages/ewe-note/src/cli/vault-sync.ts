#!/usr/bin/env node
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

import { readFile, writeFile, stat, mkdir } from 'node:fs/promises';
import { watch, type FSWatcher } from 'node:fs';
import { join, relative, dirname, extname } from 'node:path';
import {
  parseFrontmatter,
  extractTags,
  extractWikiLinks,
} from '@eweser/shared';
import { generateNoteId } from './import-vault';
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

async function getFileMtime(filePath: string): Promise<Date | null> {
  try {
    const s = await stat(filePath);
    return s.mtime;
  } catch {
    return null;
  }
}

async function noteFromFile(
  filePath: string,
  vaultPath: string,
  vaultName: string
): Promise<ImportedNote> {
  const rawContent = await readFile(filePath, 'utf-8');
  const relPath = relative(vaultPath, filePath);
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
  const vaultName = getArg('--name') ?? 'My Vault';
  const statePath = getArg('--state') ?? './vault-state.json';
  const debounceMs = Number(getArg('--debounce') ?? '500');

  if (!vaultPath) {
    console.error(
      'Usage: npx tsx vault-sync.ts --vault /path/to/vault [--name "Vault"] [--state ./state.json] [--debounce 500]'
    );
    process.exit(1);
  }

  const engine = new VaultSyncEngine({
    vaultPath,
    vaultName,
    statePath,
    debounceMs,
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
