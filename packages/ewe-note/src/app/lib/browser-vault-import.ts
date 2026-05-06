import {
  uploadFile,
  type Database,
  type FileAttachment,
  type Note,
  type Room,
} from '@eweser/db';
import {
  buildRef,
  extractTags,
  extractWikiLinks,
  parseFrontmatter,
  type FolderBase,
} from '@eweser/shared';
import type { Doc } from 'yjs';

const IGNORED_DIRS = new Set(['.obsidian', '.trash', '.git', 'node_modules']);
const MARKDOWN_EXTENSION = '.md';
const ATTACHMENT_MIME_TYPES: Record<string, string> = {
  '.avif': 'image/avif',
  '.base': 'text/yaml',
  '.bmp': 'image/bmp',
  '.canvas': 'application/json',
  '.flac': 'audio/flac',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.m4a': 'audio/mp4',
  '.mkv': 'video/x-matroska',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.ogg': 'audio/ogg',
  '.ogv': 'video/ogg',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain',
  '.wav': 'audio/wav',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
};

type RemoteSyncReadyProvider = {
  synced?: boolean;
  on: (
    event: 'synced' | 'authenticationFailed',
    callback: (payload: { state?: boolean; reason?: string }) => void
  ) => void;
  off: (
    event: 'synced' | 'authenticationFailed',
    callback: (payload: { state?: boolean; reason?: string }) => void
  ) => void;
};

type FolderMapDoc = Doc & {
  getMap: (name: string) => {
    set: (key: string, value: string) => void;
  };
  transact: (fn: () => void) => void;
};

type PreparedVaultNote = {
  _id: string;
  aliases: string[];
  attachmentRefs: string[];
  folderId: string | null;
  frontmatter: Record<string, unknown>;
  sourcePath: string;
  sourceVault: string;
  tags: string[];
  text: string;
};

type PreparedVaultAttachment = {
  file: File;
  filename: string;
  mimeType: string;
  sourcePath: string;
};

type PreparedVaultImport = {
  attachmentCount: number;
  attachments: PreparedVaultAttachment[];
  folderEntries: Array<{ id: string; path: string; record: FolderBase }>;
  noteCount: number;
  notes: PreparedVaultNote[];
  skippedPaths: string[];
  vaultName: string;
};

export type BrowserVaultImportPhase =
  | 'parsing'
  | 'connecting'
  | 'uploading'
  | 'writing'
  | 'complete';

export type BrowserVaultImportProgress = {
  current: number;
  message: string;
  phase: BrowserVaultImportPhase;
  total: number;
};

export type BrowserVaultImportResult = {
  attachmentsRoomId: string;
  attachmentsSkipped: number;
  attachmentsUploaded: number;
  noteRoomId: string;
  notesImported: number;
  remoteSyncEnabled: boolean;
  skippedPaths: string[];
  warnings: string[];
};

function normalizeSlashes(path: string) {
  return path.replace(/\\/g, '/');
}

function getFileExtension(path: string) {
  const normalized = normalizeSlashes(path);
  const lastDot = normalized.lastIndexOf('.');
  if (lastDot === -1) return '';
  return normalized.slice(lastDot).toLowerCase();
}

function getFileName(path: string) {
  const normalized = normalizeSlashes(path);
  const segments = normalized.split('/').filter(Boolean);
  return segments.at(-1) ?? normalized;
}

function getDirectoryPath(path: string) {
  const normalized = normalizeSlashes(path);
  const lastSlash = normalized.lastIndexOf('/');
  if (lastSlash === -1) return '';
  return normalized.slice(0, lastSlash);
}

function shouldIgnoreVaultPath(relativePath: string) {
  const segments = normalizeSlashes(relativePath).split('/').filter(Boolean);
  return segments.some((segment) => IGNORED_DIRS.has(segment));
}

function guessMimeType(file: File, sourcePath: string) {
  if (file.type) {
    return file.type;
  }
  return (
    ATTACHMENT_MIME_TYPES[getFileExtension(sourcePath)] ??
    'application/octet-stream'
  );
}

function normalizeRelativePath(file: File) {
  const relativePath = normalizeSlashes(file.webkitRelativePath || file.name);
  const segments = relativePath.split('/').filter(Boolean);
  const vaultName = segments[0] || 'Imported Vault';
  const sourcePath = segments.slice(1).join('/') || file.name;
  return { sourcePath, vaultName };
}

function buildFolderId(vaultName: string, folderPath: string) {
  return `${vaultName}:${folderPath}`;
}

async function sha256Hex(value: string | ArrayBuffer) {
  const bytes =
    typeof value === 'string'
      ? new TextEncoder().encode(value)
      : new Uint8Array(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function generateStableId(seed: string) {
  return (await sha256Hex(seed)).slice(0, 16);
}

function collectAttachmentRefs(markdownContent: string) {
  return extractWikiLinks(markdownContent)
    .filter((link) => link.isEmbed && link.target)
    .map((link) => normalizeSlashes(link.target));
}

function buildFolderEntries(vaultName: string, folderPaths: Set<string>) {
  const sortedPaths = Array.from(folderPaths).sort((left, right) => {
    const leftDepth = left.split('/').length;
    const rightDepth = right.split('/').length;
    return leftDepth - rightDepth || left.localeCompare(right);
  });

  return sortedPaths.map((path) => {
    const parentPath = getDirectoryPath(path);
    const record: FolderBase = {
      name: getFileName(path),
      ...(parentPath
        ? { parentFolderId: buildFolderId(vaultName, parentPath) }
        : {}),
    };
    return {
      id: buildFolderId(vaultName, path),
      path,
      record,
    };
  });
}

export async function prepareVaultImport(
  filesLike: FileList | File[],
  onProgress?: (progress: BrowserVaultImportProgress) => void
): Promise<PreparedVaultImport> {
  const files = Array.from(filesLike);
  if (files.length === 0) {
    throw new Error('Choose an Obsidian vault folder with at least one file.');
  }

  const first = normalizeRelativePath(files[0]);
  const notes: PreparedVaultNote[] = [];
  const attachments: PreparedVaultAttachment[] = [];
  const folderPaths = new Set<string>();
  const skippedPaths: string[] = [];

  let index = 0;
  for (const file of files) {
    index += 1;
    const { sourcePath, vaultName } = normalizeRelativePath(file);
    if (vaultName !== first.vaultName) {
      throw new Error('Vault import must come from a single folder selection.');
    }
    if (!sourcePath || shouldIgnoreVaultPath(sourcePath)) {
      skippedPaths.push(sourcePath || file.name);
      continue;
    }

    onProgress?.({
      current: index,
      message: `Scanning ${sourcePath}`,
      phase: 'parsing',
      total: files.length,
    });

    const folderPath = getDirectoryPath(sourcePath);
    if (folderPath) {
      const parts = folderPath.split('/').filter(Boolean);
      for (let partIndex = 0; partIndex < parts.length; partIndex += 1) {
        folderPaths.add(parts.slice(0, partIndex + 1).join('/'));
      }
    }

    if (getFileExtension(sourcePath) === MARKDOWN_EXTENSION) {
      const rawContent = await file.text();
      const { content, frontmatter } = parseFrontmatter(rawContent);
      const tags = extractTags(content);
      const frontmatterTags = frontmatter.tags;
      if (Array.isArray(frontmatterTags)) {
        for (const tag of frontmatterTags) {
          if (typeof tag === 'string' && !tags.includes(tag)) {
            tags.push(tag);
          }
        }
      }

      const aliases: string[] = [];
      const frontmatterAliases = frontmatter.aliases;
      if (Array.isArray(frontmatterAliases)) {
        for (const alias of frontmatterAliases) {
          if (typeof alias === 'string') {
            aliases.push(alias);
          }
        }
      }

      notes.push({
        _id: await generateStableId(`${first.vaultName}:${sourcePath}`),
        aliases,
        attachmentRefs: collectAttachmentRefs(content),
        folderId: folderPath
          ? buildFolderId(first.vaultName, folderPath)
          : null,
        frontmatter,
        sourcePath,
        sourceVault: first.vaultName,
        tags,
        text: content,
      });
      continue;
    }

    attachments.push({
      file,
      filename: file.name,
      mimeType: guessMimeType(file, sourcePath),
      sourcePath,
    });
  }

  return {
    attachmentCount: attachments.length,
    attachments,
    folderEntries: buildFolderEntries(first.vaultName, folderPaths),
    noteCount: notes.length,
    notes,
    skippedPaths,
    vaultName: first.vaultName,
  };
}

async function waitForRemoteSyncProviderReady(
  provider: RemoteSyncReadyProvider | null | undefined,
  timeoutMs = 15000
) {
  if (!provider) {
    throw new Error('Remote sync provider is missing.');
  }

  if (provider.synced) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
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

async function waitForRemoteRoomReady(room: {
  syncProvider?: RemoteSyncReadyProvider | null;
}) {
  const startedAt = Date.now();
  while (!room.syncProvider) {
    if (Date.now() - startedAt >= 15000) {
      throw new Error('Timed out waiting for remote sync provider.');
    }
    await new Promise((resolve) => window.setTimeout(resolve, 100));
  }

  await waitForRemoteSyncProviderReady(room.syncProvider, 15000);
}

async function resolveNotesRoom(
  db: Database,
  roomId: string,
  collectionKey: 'notes' | 'fileAttachments',
  remoteSyncEnabled: boolean
) {
  const localRoom =
    collectionKey === 'notes'
      ? db.getRoom<Note>('notes', roomId)
      : db.getRoom<FileAttachment>('fileAttachments', roomId);

  if (!localRoom) {
    throw new Error(`Failed to create ${collectionKey} room.`);
  }

  if (!remoteSyncEnabled) {
    await localRoom.load({ awaitLoadRemote: false, loadRemote: false });
    return localRoom;
  }

  const synced = await db.syncRegistry();
  if (!synced) {
    throw new Error('Failed to sync registry before importing the vault.');
  }

  const serverRoom = db.registry.find(
    (room) => room.id === roomId && room.collectionKey === collectionKey
  );
  if (!serverRoom) {
    throw new Error(
      `Remote ${collectionKey} room was not found after registry sync.`
    );
  }

  const room = await db.loadRoom(serverRoom, {
    awaitLoadRemote: true,
    loadRemote: true,
  });
  await waitForRemoteRoomReady(room);
  return room as Room<Note> | Room<FileAttachment>;
}

function writeFoldersToRoom(
  room: Room<Note>,
  folderEntries: PreparedVaultImport['folderEntries']
) {
  if (!room.ydoc || folderEntries.length === 0) {
    return;
  }

  const doc = room.ydoc as unknown as FolderMapDoc;
  const folderMap = doc.getMap('folders');
  doc.transact(() => {
    for (const folder of folderEntries) {
      folderMap.set(folder.id, JSON.stringify(folder.record));
    }
  });
}

function buildAttachmentParentRefs(
  db: Database,
  noteRoomId: string,
  notes: PreparedVaultNote[]
) {
  const refsByTarget = new Map<string, string[]>();

  for (const note of notes) {
    const noteRef = buildRef({
      authServer: db.authServer,
      collectionKey: 'notes',
      documentId: note._id,
      roomId: noteRoomId,
    });

    for (const attachmentRef of note.attachmentRefs) {
      const normalized = normalizeSlashes(attachmentRef).toLowerCase();
      const targets = refsByTarget.get(normalized) ?? [];
      targets.push(noteRef);
      refsByTarget.set(normalized, targets);
    }
  }

  return refsByTarget;
}

export async function importVaultFromFiles(params: {
  db: Database;
  files: FileList | File[];
  onProgress?: (progress: BrowserVaultImportProgress) => void;
  remoteSyncEnabled: boolean;
  setSelectedRoom?: (room: Room<Note> | null) => void;
}) {
  const prepared = await prepareVaultImport(params.files, params.onProgress);
  if (prepared.noteCount === 0) {
    throw new Error(
      'No markdown notes were found in the selected vault folder.'
    );
  }

  params.onProgress?.({
    current: 0,
    message: `Creating rooms for ${prepared.vaultName}`,
    phase: 'connecting',
    total: 1,
  });

  const noteRoomId = crypto.randomUUID();
  const attachmentsRoomId = crypto.randomUUID();

  params.db.newRoom<Note>({
    collectionKey: 'notes',
    id: noteRoomId,
    name: prepared.vaultName,
  });
  params.db.newRoom<FileAttachment>({
    collectionKey: 'fileAttachments',
    id: attachmentsRoomId,
    name: `${prepared.vaultName} Attachments`,
  });

  const noteRoom = (await resolveNotesRoom(
    params.db,
    noteRoomId,
    'notes',
    params.remoteSyncEnabled
  )) as Room<Note>;
  const attachmentsRoom = (await resolveNotesRoom(
    params.db,
    attachmentsRoomId,
    'fileAttachments',
    params.remoteSyncEnabled
  )) as Room<FileAttachment>;

  writeFoldersToRoom(noteRoom, prepared.folderEntries);

  const Notes = noteRoom.getDocuments();
  const warnings: string[] = [];
  params.onProgress?.({
    current: 0,
    message: `Writing ${prepared.noteCount} notes`,
    phase: 'writing',
    total: prepared.noteCount,
  });

  let noteIndex = 0;
  for (const note of prepared.notes) {
    noteIndex += 1;
    const now = Date.now();
    Notes.set({
      _created: now,
      _id: note._id,
      _ref: buildRef({
        authServer: params.db.authServer,
        collectionKey: 'notes',
        documentId: note._id,
        roomId: noteRoomId,
      }),
      _updated: now,
      aliases: note.aliases,
      ...(note.folderId ? { folderIds: [note.folderId] } : {}),
      frontmatter: note.frontmatter,
      sourcePath: note.sourcePath,
      sourceVault: note.sourceVault,
      tags: note.tags,
      text: note.text,
    });
    params.onProgress?.({
      current: noteIndex,
      message: `Imported ${note.sourcePath}`,
      phase: 'writing',
      total: prepared.noteCount,
    });
  }

  let attachmentsUploaded = 0;
  let attachmentsSkipped = prepared.attachmentCount;
  if (params.remoteSyncEnabled && prepared.attachments.length > 0) {
    const parentRefsByTarget = buildAttachmentParentRefs(
      params.db,
      noteRoomId,
      prepared.notes
    );
    const Attachments = attachmentsRoom.getDocuments();
    attachmentsSkipped = 0;

    let attachmentIndex = 0;
    for (const attachment of prepared.attachments) {
      attachmentIndex += 1;
      params.onProgress?.({
        current: attachmentIndex,
        message: `Uploading ${attachment.sourcePath}`,
        phase: 'uploading',
        total: prepared.attachments.length,
      });

      try {
        const bytes = await attachment.file.arrayBuffer();
        const contentHash = await sha256Hex(bytes);
        const normalizedTarget = normalizeSlashes(
          attachment.sourcePath
        ).toLowerCase();
        const fileNameTarget = getFileName(normalizedTarget);
        const parentNoteRefs = [
          ...(parentRefsByTarget.get(normalizedTarget) ?? []),
          ...(parentRefsByTarget.get(fileNameTarget) ?? []),
        ];

        const uploaded = await uploadFile({
          db: params.db,
          file: bytes,
          metadata: {
            baseId: noteRoomId,
            filename: attachment.filename,
            mimeType: attachment.mimeType,
            ...(parentNoteRefs.length > 0 ? { parentNoteRefs } : {}),
            size: attachment.file.size,
            sourcePath: attachment.sourcePath,
            sourceVault: prepared.vaultName,
          },
          roomId: attachmentsRoomId,
        });

        const attachmentId = await generateStableId(
          `${noteRoomId}:${attachment.sourcePath}`
        );
        const now = Date.now();
        Attachments.set({
          ...uploaded,
          _created: uploaded._created ?? now,
          _id: attachmentId,
          _ref: buildRef({
            authServer: params.db.authServer,
            collectionKey: 'fileAttachments',
            documentId: attachmentId,
            roomId: attachmentsRoomId,
          }),
          _updated: now,
          baseId: noteRoomId,
          contentHash,
          filename: attachment.filename,
          mimeType: attachment.mimeType,
          ...(parentNoteRefs.length > 0 ? { parentNoteRefs } : {}),
          size: attachment.file.size,
          sourcePath: attachment.sourcePath,
          sourceVault: prepared.vaultName,
        });
        attachmentsUploaded += 1;
      } catch (error) {
        attachmentsSkipped += 1;
        const message =
          error instanceof Error
            ? error.message
            : 'Unknown attachment upload error.';
        warnings.push(
          `Attachment skipped: ${attachment.sourcePath} (${message})`
        );
      }
    }
  }

  if (!params.remoteSyncEnabled && prepared.attachments.length > 0) {
    warnings.push(
      'Attachments were skipped because remote sync is not active. Sign in first to upload vault files.'
    );
  }

  params.setSelectedRoom?.(noteRoom);
  params.onProgress?.({
    current: prepared.noteCount,
    message: `Imported ${prepared.noteCount} notes`,
    phase: 'complete',
    total: prepared.noteCount,
  });

  return {
    attachmentsRoomId,
    attachmentsSkipped,
    attachmentsUploaded,
    noteRoomId,
    notesImported: prepared.noteCount,
    remoteSyncEnabled: params.remoteSyncEnabled,
    skippedPaths: prepared.skippedPaths,
    warnings,
  } satisfies BrowserVaultImportResult;
}
