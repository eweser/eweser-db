import type { FileAttachment } from '../types.js';
import type { Database } from '../index.js';

type FileBody = Blob | Uint8Array | ArrayBuffer;

type UploadAttachmentMetadata = Pick<
  FileAttachment,
  | 'baseId'
  | 'filename'
  | 'mimeType'
  | 'parentNoteRefs'
  | 'size'
  | 'sourcePath'
  | 'sourceVault'
>;

type UploadResponse = {
  attachment: FileAttachment;
};

type PresignResponse = {
  url: string;
};

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
  metadata: UploadAttachmentMetadata;
  roomId: string;
}): Promise<FileAttachment> {
  const blob = resolveBlob(params.file, params.metadata.mimeType);
  const form = new FormData();
  form.append('roomId', params.roomId);
  form.append('attachment', JSON.stringify(params.metadata));
  form.append('file', blob, params.metadata.filename);

  const data = await fetchJson<UploadResponse>(params.db, '/api/files/upload', {
    body: form,
    method: 'POST',
  });

  return data.attachment;
}

export async function getFileUrl(params: {
  attachment: Pick<FileAttachment, 'remoteObjectKey'>;
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
  const data = await fetchJson<PresignResponse>(
    params.db,
    `/api/files/presign?${query.toString()}`,
    { method: 'GET' }
  );

  return data.url;
}

export async function downloadFile(params: {
  attachment: Pick<FileAttachment, 'remoteObjectKey'>;
  db: Database;
  roomId: string;
}): Promise<Uint8Array> {
  const url = await getFileUrl(params);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status}`);
  }

  return new Uint8Array(await response.arrayBuffer());
}
