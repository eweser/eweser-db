import type { Note } from '@eweser/db';
import { serializeFrontmatter } from '@eweser/shared';

const DB_NAME = 'ewe-note-browser-local-vaults';
const DB_VERSION = 1;
const STORE_NAME = 'mounted-files';
const IGNORED_DIRECTORIES = new Set([
  '.git',
  '.obsidian',
  '.trash',
  'node_modules',
]);

type BrowserWritable = {
  write(data: string): Promise<void>;
  close(): Promise<void>;
};

export type BrowserWritableFileHandle = {
  kind: 'file';
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<BrowserWritable>;
  queryPermission?(options: { mode: 'readwrite' }): Promise<PermissionState>;
};

export type BrowserDirectoryHandle = {
  kind: 'directory';
  name: string;
  values(): AsyncIterableIterator<
    BrowserDirectoryHandle | BrowserWritableFileHandle
  >;
};

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: (options?: {
    id?: string;
    mode?: 'read' | 'readwrite';
  }) => Promise<BrowserDirectoryHandle>;
};

type BrowserBackedNote = Pick<
  Note,
  '_id' | 'frontmatter' | 'sourcePath' | 'sourceVault' | 'text'
>;

type MountedFileEntry = {
  handle: BrowserWritableFileHandle;
  key: string;
  lastRoomMarkdown: string;
  noteId: string;
  roomId: string;
  sourcePath: string;
  sourceVault: string;
};

const mountedFileCache = new Map<string, MountedFileEntry>();
const writeQueues = new Map<string, Promise<void>>();

function mountedFileKey(roomId: string, noteId: string) {
  return `${roomId}\u0000${noteId}`;
}

function normalizePath(path: string) {
  return path.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+/g, '/');
}

function noteMarkdown(note: BrowserBackedNote) {
  return serializeFrontmatter(note.frontmatter ?? {}, note.text);
}

function hasIndexedDb() {
  return typeof indexedDB !== 'undefined';
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
  });
}

async function openMountedFilesDb(): Promise<IDBDatabase | null> {
  if (!hasIndexedDb()) return null;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('IndexedDB open failed'));
  });
}

async function putMountedFile(entry: MountedFileEntry) {
  mountedFileCache.set(entry.key, entry);
  const db = await openMountedFilesDb();
  if (!db) return;

  try {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(entry);
    await transactionDone(transaction);
  } catch {
    // Some test/browser environments cannot structured-clone file handles.
    // The live session still remains mounted through mountedFileCache.
  } finally {
    db.close();
  }
}

async function loadMountedFiles(roomId: string) {
  const cached = Array.from(mountedFileCache.values()).filter(
    (entry) => entry.roomId === roomId
  );
  const db = await openMountedFilesDb();
  if (!db) return cached;

  try {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).getAll();
    const stored = await new Promise<MountedFileEntry[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as MountedFileEntry[]);
      request.onerror = () =>
        reject(request.error ?? new Error('IndexedDB read failed'));
    });
    await transactionDone(transaction);
    for (const entry of stored) {
      if (!mountedFileCache.has(entry.key)) {
        mountedFileCache.set(entry.key, entry);
      }
    }
    return Array.from(mountedFileCache.values()).filter(
      (entry) => entry.roomId === roomId
    );
  } catch {
    return cached;
  } finally {
    db.close();
  }
}

async function collectDirectoryFiles(
  directory: BrowserDirectoryHandle,
  vaultName: string,
  relativeDirectory = ''
) {
  const files: File[] = [];
  const handlesBySourcePath = new Map<string, BrowserWritableFileHandle>();

  for await (const entry of directory.values()) {
    if (entry.kind === 'directory') {
      if (IGNORED_DIRECTORIES.has(entry.name)) continue;
      const nextRelativeDirectory = relativeDirectory
        ? `${relativeDirectory}/${entry.name}`
        : entry.name;
      const nested = await collectDirectoryFiles(
        entry,
        vaultName,
        nextRelativeDirectory
      );
      files.push(...nested.files);
      nested.handlesBySourcePath.forEach((handle, path) =>
        handlesBySourcePath.set(path, handle)
      );
      continue;
    }

    const sourcePath = normalizePath(
      relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name
    );
    if (!sourcePath.toLowerCase().endsWith('.md')) continue;

    const file = await entry.getFile();
    Object.defineProperty(file, 'webkitRelativePath', {
      configurable: true,
      value: `${vaultName}/${sourcePath}`,
    });
    files.push(file);
    handlesBySourcePath.set(sourcePath, entry);
  }

  return { files, handlesBySourcePath };
}

export function supportsBrowserLocalVaults() {
  return (
    typeof (window as DirectoryPickerWindow).showDirectoryPicker === 'function'
  );
}

export async function pickBrowserLocalVault() {
  const picker = (window as DirectoryPickerWindow).showDirectoryPicker;
  if (!picker) {
    throw new Error(
      'Writable local vaults require desktop Chrome or Edge. This browser can still import a folder copy.'
    );
  }

  const directory = await picker({
    id: 'ewe-note-local-vault',
    mode: 'readwrite',
  });
  const collected = await collectDirectoryFiles(directory, directory.name);
  return { ...collected, vaultName: directory.name };
}

export async function registerBrowserLocalVaultFiles(params: {
  handlesBySourcePath: ReadonlyMap<string, BrowserWritableFileHandle>;
  notes: readonly BrowserBackedNote[];
  roomId: string;
}) {
  for (const note of params.notes) {
    if (!note.sourcePath || !note.sourceVault) continue;
    const handle = params.handlesBySourcePath.get(
      normalizePath(note.sourcePath)
    );
    if (!handle) continue;

    await putMountedFile({
      handle,
      key: mountedFileKey(params.roomId, note._id),
      lastRoomMarkdown: noteMarkdown(note),
      noteId: note._id,
      roomId: params.roomId,
      sourcePath: normalizePath(note.sourcePath),
      sourceVault: note.sourceVault,
    });
  }
}

export async function writeBrowserLocalVaultNotes(
  roomId: string,
  notes: readonly BrowserBackedNote[]
) {
  const mountedFiles = await loadMountedFiles(roomId);
  const noteById = new Map(notes.map((note) => [note._id, note]));

  for (const entry of mountedFiles) {
    const note = noteById.get(entry.noteId);
    if (!note) continue;
    const markdown = noteMarkdown(note);
    if (markdown === entry.lastRoomMarkdown) continue;

    const previousWrite = writeQueues.get(entry.key) ?? Promise.resolve();
    const nextWrite = previousWrite.then(async () => {
      if (markdown === entry.lastRoomMarkdown) return;

      const permission = entry.handle.queryPermission
        ? await entry.handle.queryPermission({ mode: 'readwrite' })
        : 'granted';
      if (permission !== 'granted') return;

      const writable = await entry.handle.createWritable();
      await writable.write(markdown);
      await writable.close();
      entry.lastRoomMarkdown = markdown;
      await putMountedFile(entry);
    });
    writeQueues.set(entry.key, nextWrite);
    await nextWrite.finally(() => {
      if (writeQueues.get(entry.key) === nextWrite) {
        writeQueues.delete(entry.key);
      }
    });
  }
}

export async function clearBrowserLocalVaultsForTests() {
  mountedFileCache.clear();
  writeQueues.clear();
  const db = await openMountedFilesDb();
  if (!db) return;
  try {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).clear();
    await transactionDone(transaction);
  } finally {
    db.close();
  }
}
