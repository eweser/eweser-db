import type { FileAttachmentBase } from '@eweser/shared';

const DB_NAME = 'ewe-note-browser-attachment-cache';
const DB_VERSION = 1;
const STORE_NAME = 'attachments';

type BrowserAttachmentCacheReference = Pick<
  FileAttachmentBase,
  'baseId' | 'contentHash' | 'sourcePath'
>;

export type BrowserAttachmentCacheEntry = BrowserAttachmentCacheReference &
  Pick<FileAttachmentBase, 'filename' | 'mimeType'> & {
    blob: Blob;
  };

type StoredBrowserAttachment = BrowserAttachmentCacheEntry & {
  createdAt: number;
  key: string;
};

function normalizeSourcePath(sourcePath: string): string {
  return sourcePath
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/\/+/g, '/');
}

export function getBrowserAttachmentCacheKey({
  baseId,
  contentHash,
  sourcePath,
}: BrowserAttachmentCacheReference): string {
  return [
    baseId,
    contentHash,
    normalizeSourcePath(sourcePath).toLowerCase(),
  ].join('\u0000');
}

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('IndexedDB request failed'));
  });
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

async function openAttachmentCacheDb(): Promise<IDBDatabase | null> {
  if (!hasIndexedDb()) return null;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('IndexedDB open failed'));
  });
}

export async function putBrowserAttachmentCache(
  entry: BrowserAttachmentCacheEntry
): Promise<boolean> {
  const db = await openAttachmentCacheDb();
  if (!db) return false;

  try {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const stored: StoredBrowserAttachment = {
      ...entry,
      key: getBrowserAttachmentCacheKey(entry),
      sourcePath: normalizeSourcePath(entry.sourcePath),
      createdAt: Date.now(),
    };

    store.put(stored);
    await transactionDone(transaction);
    return true;
  } finally {
    db.close();
  }
}

export async function getCachedBrowserAttachmentBlob(
  reference: BrowserAttachmentCacheReference
): Promise<Blob | null> {
  const db = await openAttachmentCacheDb();
  if (!db) return null;

  try {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const stored = await requestToPromise<StoredBrowserAttachment | undefined>(
      store.get(getBrowserAttachmentCacheKey(reference))
    );
    await transactionDone(transaction);
    return stored?.blob ?? null;
  } finally {
    db.close();
  }
}

export async function getCachedBrowserAttachmentUrls(
  attachments: readonly FileAttachmentBase[]
): Promise<Record<string, string>> {
  if (
    typeof URL === 'undefined' ||
    typeof URL.createObjectURL !== 'function' ||
    attachments.length === 0
  ) {
    return {};
  }

  const urls: Record<string, string> = {};
  for (const attachment of attachments) {
    const blob = await getCachedBrowserAttachmentBlob(attachment);
    if (!blob) continue;
    urls[attachment.sourcePath] = URL.createObjectURL(blob);
  }
  return urls;
}

export function revokeCachedBrowserAttachmentUrls(
  attachmentUrls: Readonly<Record<string, string>>
): void {
  if (typeof URL === 'undefined' || typeof URL.revokeObjectURL !== 'function') {
    return;
  }

  for (const url of Object.values(attachmentUrls)) {
    if (url.startsWith('blob:')) URL.revokeObjectURL(url);
  }
}

export async function clearBrowserAttachmentCacheForTests(): Promise<void> {
  const db = await openAttachmentCacheDb();
  if (!db) return;

  try {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).clear();
    await transactionDone(transaction);
  } finally {
    db.close();
  }
}
