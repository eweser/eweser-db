import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../env.js';

const PRESIGN_TTL_SECONDS = 60 * 15;

export type StorageProviderProfile = {
  bucket: string | null;
  configured: boolean;
  endpoint: string | null;
  forcePathStyle: boolean;
  id: string;
  kind: 's3-compatible';
  label: string;
  maxFileSizeMb: number;
  region: string;
};

export function getStorageProviderProfile(
  profileId = env.STORAGE_PROVIDER_PROFILE_ID
): StorageProviderProfile | null {
  if (profileId !== env.STORAGE_PROVIDER_PROFILE_ID) {
    return null;
  }

  return {
    bucket: env.STORAGE_S3_BUCKET ?? null,
    configured: storageIsConfigured(profileId),
    endpoint: env.STORAGE_S3_ENDPOINT ?? null,
    forcePathStyle: env.STORAGE_S3_FORCE_PATH_STYLE,
    id: env.STORAGE_PROVIDER_PROFILE_ID,
    kind: 's3-compatible',
    label:
      env.STORAGE_PROVIDER_PROFILE_ID === 'railway-buckets'
        ? 'Railway Buckets'
        : env.STORAGE_PROVIDER_PROFILE_ID,
    maxFileSizeMb: env.STORAGE_MAX_FILE_SIZE_MB,
    region: env.STORAGE_S3_REGION,
  };
}

function ensureStorageConfig(profileId = env.STORAGE_PROVIDER_PROFILE_ID) {
  if (profileId !== env.STORAGE_PROVIDER_PROFILE_ID) {
    throw new Error('Storage provider profile unavailable.');
  }

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

function createStorageClient(profileId = env.STORAGE_PROVIDER_PROFILE_ID) {
  const { accessKeyId, endpoint, secretAccessKey } =
    ensureStorageConfig(profileId);

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

export function storageIsConfigured(
  profileId = env.STORAGE_PROVIDER_PROFILE_ID
): boolean {
  return (
    profileId === env.STORAGE_PROVIDER_PROFILE_ID &&
    Boolean(
      env.STORAGE_S3_ENDPOINT &&
      env.STORAGE_S3_BUCKET &&
      env.STORAGE_S3_ACCESS_KEY_ID &&
      env.STORAGE_S3_SECRET_ACCESS_KEY
    )
  );
}

export function buildAttachmentObjectKey(params: {
  roomId: string;
  contentHash: string;
  filename: string;
}) {
  const safeFilename = sanitizeObjectKeyFilename(params.filename, 'attachment');
  return `rooms/${params.roomId}/${params.contentHash}/${safeFilename}`;
}

export function buildSnapshotObjectKey(params: {
  userId: string;
  contentHash: string;
  filename: string;
}) {
  const safeFilename = sanitizeObjectKeyFilename(params.filename, 'snapshot');
  return `backups/${params.userId}/${params.contentHash}/${safeFilename}`;
}

function sanitizeObjectKeyFilename(filename: string, fallback: string) {
  const normalizedFilename = filename
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return normalizedFilename || fallback;
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
  providerProfileId?: string | undefined;
}) {
  const client = createStorageClient(params.providerProfileId);
  const { bucket } = ensureStorageConfig(params.providerProfileId);

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.objectKey,
      Body: params.body,
      ContentType: params.contentType,
    })
  );
}

export async function objectExists(
  objectKey: string,
  providerProfileId?: string | undefined
): Promise<boolean> {
  const client = createStorageClient(providerProfileId);
  const { bucket } = ensureStorageConfig(providerProfileId);

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

export async function createDownloadUrl(
  objectKey: string,
  providerProfileId?: string | undefined
): Promise<string> {
  const client = createStorageClient(providerProfileId);
  const { bucket } = ensureStorageConfig(providerProfileId);

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucket,
      Key: objectKey,
    }),
    { expiresIn: PRESIGN_TTL_SECONDS }
  );
}

export async function createUploadUrl(params: {
  contentType: string;
  objectKey: string;
  providerProfileId?: string | undefined;
}): Promise<string> {
  const client = createStorageClient(params.providerProfileId);
  const { bucket } = ensureStorageConfig(params.providerProfileId);

  return getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.objectKey,
      ContentType: params.contentType,
    }),
    { expiresIn: PRESIGN_TTL_SECONDS }
  );
}

export function getDownloadUrlTtlSeconds(): number {
  return PRESIGN_TTL_SECONDS;
}
