import type { FileAttachment } from '../types.js';
import type { Database } from '../index.js';

type FileBody = Blob | Uint8Array | ArrayBuffer;

type UploadAttachmentMetadata = Pick<
  FileAttachment,
  | 'baseId'
  | 'contentHash'
  | 'filename'
  | 'mimeType'
  | 'parentNoteRefs'
  | 'size'
  | 'sourcePath'
  | 'sourceVault'
>;

type UploadResponse = {
  attachment: FileAttachment;
  upload: {
    headers: Record<string, string>;
    method: 'PUT';
    url: string;
  } | null;
};

type PresignResponse = {
  url: string;
};

export type FileCacheStatus = {
  available: boolean;
  cachedAt?: string;
  pinned: boolean;
};

type CacheableAttachment = Pick<FileAttachment, 'remoteObjectKey'> &
  Partial<Pick<FileAttachment, 'contentHash' | 'remoteProviderProfileId'>>;

type FileCacheRecord = {
  bytes: Uint8Array;
  cachedAt: string;
  contentHash: string;
  key: string;
  objectKey: string;
  pinned: boolean;
  providerProfileId: string;
};

export type FileCacheAdapter = {
  get(key: string): Promise<FileCacheRecord | null>;
  put(record: FileCacheRecord): Promise<void>;
  remove(key: string): Promise<void>;
};

const CACHE_DB_NAME = 'eweser-file-cache';
const CACHE_DB_VERSION = 1;
const CACHE_STORE = 'files';

function requireToken(db: Database): string {
  const token = db.getToken();
  if (!token) {
    throw new Error('No access grant token available for file request.');
  }
  return token;
}

function resolveBlob(file: FileBody, fallbackMimeType: string): Blob {
  if (file instanceof Blob) {
    return file;
  }

  if (file instanceof ArrayBuffer) {
    return new Blob([file], { type: fallbackMimeType });
  }

  return new Blob([Uint8Array.from(file)], { type: fallbackMimeType });
}

async function resolveBytes(file: FileBody): Promise<Uint8Array> {
  if (file instanceof Blob) {
    return new Uint8Array(await file.arrayBuffer());
  }
  if (file instanceof ArrayBuffer) {
    return new Uint8Array(file);
  }
  return Uint8Array.from(file);
}

function cacheKey(attachment: CacheableAttachment): string | null {
  const objectKey = attachment.remoteObjectKey?.trim();
  const providerProfileId = attachment.remoteProviderProfileId?.trim();
  const contentHash = attachment.contentHash?.trim();
  if (!objectKey || !providerProfileId || !contentHash) return null;
  return `${providerProfileId}|${objectKey}|${contentHash}`;
}

function openFileCacheDb(): Promise<IDBDatabase> {
  if (!globalThis.indexedDB) {
    return Promise.reject(new Error('File cache is unavailable.'));
  }

  return new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.open(CACHE_DB_NAME, CACHE_DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(CACHE_STORE)) {
        database.createObjectStore(CACHE_STORE, { keyPath: 'key' });
      }
    };
    request.onerror = () =>
      reject(request.error ?? new Error('Failed to open file cache.'));
    request.onsuccess = () => resolve(request.result);
  });
}

async function runFileCache<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const database = await openFileCacheDb();
  return await new Promise((resolve, reject) => {
    const transaction = database.transaction(CACHE_STORE, mode);
    const store = transaction.objectStore(CACHE_STORE);
    const request = operation(store);
    request.onerror = () =>
      reject(request.error ?? new Error('File cache request failed.'));
    request.onsuccess = () => resolve(request.result);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error('File cache transaction failed.'));
    };
  });
}

function defaultFileCache(): FileCacheAdapter {
  return {
    get: async (key) =>
      ((await runFileCache('readonly', (store) => store.get(key))) as
        | FileCacheRecord
        | undefined) ?? null,
    put: async (record) => {
      await runFileCache('readwrite', (store) => store.put(record));
    },
    remove: async (key) => {
      await runFileCache('readwrite', (store) => store.delete(key));
    },
  };
}

function resolveCache(cache?: FileCacheAdapter | false): FileCacheAdapter {
  if (cache === false) {
    throw new Error('File cache is disabled for this request.');
  }
  return cache ?? defaultFileCache();
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('SHA-256 verification is unavailable.');
  }
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', copy.buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function verifyContentHash(bytes: Uint8Array, contentHash: string) {
  const actual = await sha256Hex(bytes);
  if (actual !== contentHash) {
    throw new Error('Downloaded file failed content hash verification.');
  }
}

async function fetchJson<T>(
  db: Database,
  path: string,
  init: RequestInit
): Promise<T> {
  const token = requireToken(db);
  const response = await fetch(`${db.authServer}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });

  const data = (await response.json()) as { error?: string } & T;
  if (!response.ok || data.error) {
    throw new Error(data.error ?? `File request failed: ${response.status}`);
  }

  return data;
}

export async function uploadFile(params: {
  db: Database;
  file: FileBody;
  metadata: Omit<UploadAttachmentMetadata, 'contentHash'> &
    Partial<Pick<UploadAttachmentMetadata, 'contentHash'>>;
  providerProfileId?: string | undefined;
  roomId: string;
}): Promise<FileAttachment> {
  const bytes = await resolveBytes(params.file);
  const contentHash = params.metadata.contentHash ?? (await sha256Hex(bytes));
  const metadata: UploadAttachmentMetadata = {
    ...params.metadata,
    contentHash,
    size: params.metadata.size ?? bytes.byteLength,
  };
  const blob = resolveBlob(params.file, params.metadata.mimeType);

  const data = await fetchJson<UploadResponse>(
    params.db,
    '/api/files/prepare-upload',
    {
      body: JSON.stringify({
        attachment: metadata,
        ...(params.providerProfileId
          ? { providerProfileId: params.providerProfileId }
          : {}),
        roomId: params.roomId,
      }),
      headers: {
        'content-type': 'application/json',
      },
      method: 'POST',
    }
  );

  if (data.upload) {
    const response = await fetch(data.upload.url, {
      body: blob,
      headers: data.upload.headers,
      method: data.upload.method,
    });
    if (!response.ok) {
      throw new Error(`Direct file upload failed: ${response.status}`);
    }
  }

  return data.attachment;
}

export async function getFileUrl(params: {
  attachment: CacheableAttachment;
  db: Database;
  roomId: string;
}): Promise<string> {
  const objectKey = params.attachment.remoteObjectKey?.trim();
  if (!objectKey) {
    throw new Error('Attachment has no remote object key.');
  }

  const query = new URLSearchParams({
    objectKey,
    roomId: params.roomId,
  });
  if (params.attachment.remoteProviderProfileId) {
    query.set('providerProfileId', params.attachment.remoteProviderProfileId);
  }
  const data = await fetchJson<PresignResponse>(
    params.db,
    `/api/files/presign?${query.toString()}`,
    { method: 'GET' }
  );

  return data.url;
}

export async function downloadFile(params: {
  attachment: CacheableAttachment;
  cache?: FileCacheAdapter | false | undefined;
  db: Database;
  pin?: boolean | undefined;
  roomId: string;
}): Promise<Uint8Array> {
  const key = cacheKey(params.attachment);
  const cache =
    key && params.cache !== false ? resolveCache(params.cache) : undefined;
  const cached = key && cache ? await cache.get(key) : null;
  if (cached?.bytes) {
    if (params.pin && !cached.pinned) {
      await cache?.put({ ...cached, pinned: true });
    }
    return cached.bytes;
  }

  const url = await getFileUrl(params);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (params.attachment.contentHash) {
    await verifyContentHash(bytes, params.attachment.contentHash);
  }
  if (key && cache && params.attachment.contentHash) {
    await cache.put({
      bytes,
      cachedAt: new Date().toISOString(),
      contentHash: params.attachment.contentHash,
      key,
      objectKey: params.attachment.remoteObjectKey ?? '',
      pinned: params.pin === true,
      providerProfileId: params.attachment.remoteProviderProfileId ?? '',
    });
  }
  return bytes;
}

export async function pinFile(params: {
  attachment: CacheableAttachment;
  cache?: FileCacheAdapter | undefined;
  db: Database;
  roomId: string;
}): Promise<Uint8Array> {
  return await downloadFile({ ...params, pin: true });
}

export async function unpinFile(params: {
  attachment: CacheableAttachment;
  cache?: FileCacheAdapter | undefined;
}): Promise<void> {
  const key = cacheKey(params.attachment);
  if (!key) return;
  const cache = resolveCache(params.cache);
  const record = await cache.get(key);
  if (!record) return;
  await cache.put({ ...record, pinned: false });
}

export async function removeCachedFile(params: {
  attachment: CacheableAttachment;
  cache?: FileCacheAdapter | undefined;
}): Promise<void> {
  const key = cacheKey(params.attachment);
  if (!key) return;
  await resolveCache(params.cache).remove(key);
}

export async function getFileCacheStatus(params: {
  attachment: CacheableAttachment;
  cache?: FileCacheAdapter | undefined;
}): Promise<FileCacheStatus> {
  const key = cacheKey(params.attachment);
  if (!key) return { available: false, pinned: false };
  const record = await resolveCache(params.cache).get(key);
  if (!record) return { available: false, pinned: false };
  return {
    available: true,
    cachedAt: record.cachedAt,
    pinned: record.pinned,
  };
}
