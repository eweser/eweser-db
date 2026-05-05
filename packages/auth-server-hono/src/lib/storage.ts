import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../env.js';

const PRESIGN_TTL_SECONDS = 60 * 15;

function ensureStorageConfig() {
  if (
    !env.STORAGE_S3_ENDPOINT ||
    !env.STORAGE_S3_BUCKET ||
    !env.STORAGE_S3_ACCESS_KEY_ID ||
    !env.STORAGE_S3_SECRET_ACCESS_KEY
  ) {
    throw new Error('Object storage is not configured.');
  }

  return {
    accessKeyId: env.STORAGE_S3_ACCESS_KEY_ID,
    bucket: env.STORAGE_S3_BUCKET,
    endpoint: env.STORAGE_S3_ENDPOINT,
    secretAccessKey: env.STORAGE_S3_SECRET_ACCESS_KEY,
  };
}

function createStorageClient() {
  const { accessKeyId, endpoint, secretAccessKey } = ensureStorageConfig();

  return new S3Client({
    endpoint,
    region: env.STORAGE_S3_REGION,
    forcePathStyle: env.STORAGE_S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export function storageIsConfigured(): boolean {
  return Boolean(
    env.STORAGE_S3_ENDPOINT &&
    env.STORAGE_S3_BUCKET &&
    env.STORAGE_S3_ACCESS_KEY_ID &&
    env.STORAGE_S3_SECRET_ACCESS_KEY
  );
}

export function buildAttachmentObjectKey(params: {
  roomId: string;
  contentHash: string;
  filename: string;
}) {
  const normalizedFilename = params.filename
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const safeFilename = normalizedFilename || 'attachment';
  return `rooms/${params.roomId}/${params.contentHash}/${safeFilename}`;
}

export function objectKeyMatchesRoom(
  roomId: string,
  objectKey: string
): boolean {
  return objectKey.startsWith(`rooms/${roomId}/`);
}

export async function uploadObject(params: {
  body: Uint8Array;
  contentType: string;
  objectKey: string;
}) {
  const client = createStorageClient();
  const { bucket } = ensureStorageConfig();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.objectKey,
      Body: params.body,
      ContentType: params.contentType,
    })
  );
}

export async function objectExists(objectKey: string): Promise<boolean> {
  const client = createStorageClient();
  const { bucket } = ensureStorageConfig();

  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: objectKey,
      })
    );
    return true;
  } catch {
    return false;
  }
}

export async function createDownloadUrl(objectKey: string): Promise<string> {
  const client = createStorageClient();
  const { bucket } = ensureStorageConfig();

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucket,
      Key: objectKey,
    }),
    { expiresIn: PRESIGN_TTL_SECONDS }
  );
}

export function getDownloadUrlTtlSeconds(): number {
  return PRESIGN_TTL_SECONDS;
}
