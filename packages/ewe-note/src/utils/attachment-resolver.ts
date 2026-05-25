/**
 * Attachment Resolver for Obsidian Vaults
 *
 * Resolves attachment file names (e.g. "image.png") to URLs that can be
 * used in the editor for rendering.
 *
 * Obsidian's attachment search order:
 *   1. Exact path relative to vault root: "Attachments/image.png"
 *   2. Common attachment folders: "Attachments/", "assets/", "files/"
 *   3. Same folder as the note
 *   4. Vault root
 *
 * Resolution Strategies:
 *   - LOCAL_FILE: File served from local filesystem via file:// URL or
 *     local Vite dev server static path (for desktop/development use).
 *   - BASE64: Image loaded as base64 data URL (for small images, offline use).
 *   - STORAGE_URL: Image hosted on a remote storage service (for cloud sync).
 */
import { logger } from './index.js';
import type * as AttachmentResolverNode from './attachment-resolver.node';
import type { FileAttachmentBase } from '@eweser/shared';

export type ResolutionStrategy = 'local_file' | 'base64' | 'storage_url';

export interface VaultConfig {
  /** Absolute path to the vault root on disk */
  vaultPath: string;
  /** Strategy for serving attachment URLs */
  strategy: ResolutionStrategy;
  /** Base URL for local HTTP server serving vault files (e.g. "http://localhost:5174") */
  localServerBaseUrl?: string;
  /** Remote storage base URL for cloud-synced attachments */
  storageBaseUrl?: string;
}

export interface AttachmentResolverContext {
  /** Imported attachment inventory for the note/base. */
  attachments?: readonly FileAttachmentBase[];
  /** Already-materialized URLs (Blob URLs, signed URLs, static URLs) keyed by sourcePath. */
  attachmentUrls?: Readonly<Record<string, string>>;
  /** Note source path used to resolve relative Obsidian attachment targets. */
  noteSourcePath?: string;
  /** Optional legacy URL-construction config. */
  vaultConfig?: VaultConfig;
}

export interface AttachmentEmbedResolutionOptions extends AttachmentResolverContext {
  /** Original Obsidian source to preserve through editor round-trips. */
  originalSource?: string;
  /** Display width parsed from Obsidian's pipe alias. */
  width?: number;
  /** Display height parsed from Obsidian's pipe alias. */
  height?: number;
}

export interface ResolvedAttachmentEmbed {
  status: 'resolved';
  target: string;
  sourcePath: string;
  filename: string;
  url: string;
  originalSource: string;
  attachment?: FileAttachmentBase;
  width?: number;
  height?: number;
}

export interface MissingAttachmentEmbed {
  status: 'missing';
  target: string;
  sourcePath?: string;
  originalSource: string;
  width?: number;
  height?: number;
}

export type AttachmentEmbedResolution =
  | ResolvedAttachmentEmbed
  | MissingAttachmentEmbed;

/** Common Obsidian attachment folder names to search */
const ATTACHMENT_FOLDERS = [
  'Attachments',
  'attachments',
  'assets',
  'files',
  '_attachments',
];

function normalizeAttachmentPath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+/g, '/');
}

function decodeAttachmentPathForSafety(path: string): string | null {
  let decoded = path;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      return null;
    }
  }
  return decoded;
}

function isSafeVaultRelativePath(path: string): boolean {
  const targetPath = path.split(/[?#]/, 1)[0]?.trim() ?? '';
  const decoded = decodeAttachmentPathForSafety(targetPath);
  if (!decoded) return false;

  const normalized = normalizeAttachmentPath(decoded);
  if (!normalized || normalized.startsWith('/')) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(normalized)) return false;
  for (const character of normalized) {
    const codePoint = character.charCodeAt(0);
    if (codePoint <= 31 || codePoint === 127) return false;
  }

  return normalized.split('/').every((segment) => segment !== '..');
}

function attachmentKey(path: string): string {
  return normalizeAttachmentPath(path).toLowerCase();
}

function baseName(path: string): string {
  return normalizeAttachmentPath(path).split('/').pop() ?? path;
}

function isImageAttachment(attachment: FileAttachmentBase): boolean {
  return attachment.mimeType.toLowerCase().startsWith('image/');
}

function isVaultConfig(
  context: VaultConfig | AttachmentResolverContext | undefined
): context is VaultConfig {
  return Boolean(
    context &&
    typeof (context as VaultConfig).vaultPath === 'string' &&
    typeof (context as VaultConfig).strategy === 'string'
  );
}

export function normalizeAttachmentResolverContext(
  context?: VaultConfig | AttachmentResolverContext,
  noteSourcePath?: string
): AttachmentResolverContext {
  if (!context) {
    return noteSourcePath ? { noteSourcePath } : {};
  }

  if (isVaultConfig(context)) {
    return {
      vaultConfig: context,
      ...(noteSourcePath ? { noteSourcePath } : {}),
    };
  }

  return {
    ...context,
    noteSourcePath: context.noteSourcePath ?? noteSourcePath,
  };
}

/**
 * Resolve an attachment name to all candidate paths relative to vault root.
 * Returns paths in order of priority.
 */
export function getAttachmentCandidates(
  attachmentName: string,
  noteSourcePath?: string
): string[] {
  if (!isSafeVaultRelativePath(attachmentName)) return [];

  const normalizedAttachmentName = normalizeAttachmentPath(attachmentName);
  const candidates: string[] = [];

  // 1. Exact path as given (e.g. "Attachments/image.png")
  candidates.push(normalizedAttachmentName);

  // 2. Common attachment folders
  for (const folder of ATTACHMENT_FOLDERS) {
    candidates.push(`${folder}/${normalizedAttachmentName}`);
  }

  // 3. Same folder as note (if source path known)
  if (noteSourcePath) {
    const normalizedNoteSourcePath = normalizeAttachmentPath(noteSourcePath);
    const noteDir = normalizedNoteSourcePath.split('/').slice(0, -1).join('/');
    if (noteDir) {
      candidates.push(`${noteDir}/${normalizedAttachmentName}`);
    }
    // Also check attachment folders relative to note's parent
    for (const folder of ATTACHMENT_FOLDERS) {
      if (noteDir) {
        candidates.push(`${noteDir}/${folder}/${normalizedAttachmentName}`);
      }
    }
  }

  // 4. Vault root basename fallback for wikilinks written with a nested path.
  const name = baseName(normalizedAttachmentName);
  if (name !== normalizedAttachmentName) {
    candidates.push(name);
  }

  // Deduplicate preserving order
  return Array.from(new Set(candidates));
}

export function findAttachmentForTarget(
  attachmentName: string,
  context: AttachmentResolverContext = {}
): FileAttachmentBase | undefined {
  if (!isSafeVaultRelativePath(attachmentName)) return undefined;

  const attachments = context.attachments;
  if (!attachments?.length) return undefined;

  const candidates = getAttachmentCandidates(
    attachmentName,
    context.noteSourcePath
  ).map(attachmentKey);
  const candidateSet = new Set(candidates);

  const exact = attachments.find((attachment) =>
    candidateSet.has(attachmentKey(attachment.sourcePath))
  );
  if (exact) return exact;

  const targetBaseName = baseName(attachmentName).toLowerCase();
  return attachments.find(
    (attachment) =>
      baseName(attachment.sourcePath).toLowerCase() === targetBaseName ||
      attachment.filename.toLowerCase() === targetBaseName
  );
}

export function isResolvableImageTarget(
  attachmentName: string,
  context: AttachmentResolverContext = {}
): boolean {
  if (!isSafeVaultRelativePath(attachmentName)) return false;

  const matchedAttachment = findAttachmentForTarget(attachmentName, context);
  if (matchedAttachment) return isImageAttachment(matchedAttachment);

  const normalizedName =
    normalizeAttachmentPath(attachmentName).split(/[?#]/, 1)[0] ??
    attachmentName;
  const lastDot = normalizedName.lastIndexOf('.');
  if (lastDot === -1) return false;

  return new Set([
    '.avif',
    '.bmp',
    '.gif',
    '.jpeg',
    '.jpg',
    '.png',
    '.svg',
    '.webp',
  ]).has(normalizedName.slice(lastDot).toLowerCase());
}

function findMaterializedUrl(
  attachment: FileAttachmentBase | undefined,
  attachmentName: string,
  context: AttachmentResolverContext
): string | undefined {
  const attachmentUrls = context.attachmentUrls;
  if (attachmentUrls) {
    const urlEntries = Object.entries(attachmentUrls);
    const lookupKeys = new Set(
      getAttachmentCandidates(attachmentName, context.noteSourcePath).map(
        attachmentKey
      )
    );

    if (attachment) {
      lookupKeys.add(attachmentKey(attachment.sourcePath));
      lookupKeys.add(attachment.filename.toLowerCase());
    }

    for (const [key, url] of urlEntries) {
      if (lookupKeys.has(attachmentKey(key)) && url) return url;
    }

    const targetBaseName = baseName(
      attachment?.sourcePath ?? attachmentName
    ).toLowerCase();
    for (const [key, url] of urlEntries) {
      if (baseName(key).toLowerCase() === targetBaseName && url) return url;
    }
  }

  if (attachment && context.vaultConfig) {
    const url = resolveAttachmentRecord(attachment, context.vaultConfig);
    return url || undefined;
  }

  if (!attachment && !context.attachments?.length && context.vaultConfig) {
    const url = resolveAttachment(
      attachmentName,
      context.vaultConfig,
      context.noteSourcePath
    );
    return url || undefined;
  }

  return undefined;
}

export function resolveAttachmentEmbed(
  attachmentName: string,
  options: AttachmentEmbedResolutionOptions = {}
): AttachmentEmbedResolution {
  const normalizedContext = normalizeAttachmentResolverContext(options);
  const originalSource =
    options.originalSource ??
    `![[${attachmentName}${
      options.width && options.height
        ? `|${options.width}x${options.height}`
        : options.width
          ? `|${options.width}`
          : ''
    }]]`;

  if (!isSafeVaultRelativePath(attachmentName)) {
    return {
      status: 'missing',
      target: attachmentName,
      originalSource,
      ...(options.width ? { width: options.width } : {}),
      ...(options.height ? { height: options.height } : {}),
    };
  }

  const attachment = findAttachmentForTarget(attachmentName, normalizedContext);
  const url = findMaterializedUrl(
    attachment,
    attachmentName,
    normalizedContext
  );

  if (attachment && url) {
    return {
      status: 'resolved',
      target: attachmentName,
      sourcePath: attachment.sourcePath,
      filename: attachment.filename || baseName(attachment.sourcePath),
      url,
      originalSource,
      attachment,
      ...(options.width ? { width: options.width } : {}),
      ...(options.height ? { height: options.height } : {}),
    };
  }

  if (!attachment && !normalizedContext.attachments?.length && url) {
    return {
      status: 'resolved',
      target: attachmentName,
      sourcePath: attachmentName,
      filename: baseName(attachmentName),
      url,
      originalSource,
      ...(options.width ? { width: options.width } : {}),
      ...(options.height ? { height: options.height } : {}),
    };
  }

  return {
    status: 'missing',
    target: attachmentName,
    sourcePath: attachment?.sourcePath,
    originalSource,
    ...(options.width ? { width: options.width } : {}),
    ...(options.height ? { height: options.height } : {}),
  };
}

/**
 * Resolve an attachment to a URL using the specified vault config.
 *
 * For 'local_file' strategy: builds a URL using the local server base URL.
 * For 'storage_url' strategy: builds a URL using the remote storage base URL.
 *
 * Note: Actual filesystem existence checks happen at the server level.
 * This function just constructs the URL; the browser will show a broken image
 * if the file doesn't exist at that path.
 */
export function resolveAttachment(
  attachmentName: string,
  vaultConfig: VaultConfig,
  noteSourcePath?: string
): string {
  const candidates = getAttachmentCandidates(attachmentName, noteSourcePath);
  // Return the first candidate as the "best guess" URL
  const primaryCandidate = candidates[0];
  if (!primaryCandidate) return '';

  switch (vaultConfig.strategy) {
    case 'local_file': {
      if (vaultConfig.localServerBaseUrl) {
        return `${vaultConfig.localServerBaseUrl}/vault/${encodeURIComponent(primaryCandidate)}`;
      }
      // Fall back to file:// for desktop Electron apps
      return `file://${vaultConfig.vaultPath}/${primaryCandidate}`;
    }

    case 'storage_url': {
      if (!vaultConfig.storageBaseUrl) {
        logger('resolveAttachment: storageBaseUrl not configured');
        return '';
      }
      return `${vaultConfig.storageBaseUrl}/${encodeURIComponent(primaryCandidate)}`;
    }

    case 'base64':
      // Base64 resolution happens async — return a placeholder here.
      // Use resolveAttachmentBase64() for the actual data URL.
      return `data:image/png;base64,placeholder`;

    default:
      return '';
  }
}

export function resolveAttachmentRecord(
  attachment: FileAttachmentBase,
  vaultConfig: VaultConfig
): string {
  if (attachment.remoteObjectKey && vaultConfig.storageBaseUrl) {
    return `${vaultConfig.storageBaseUrl}/${encodeURIComponent(
      attachment.remoteObjectKey
    )}`;
  }

  return resolveAttachment(attachment.sourcePath, vaultConfig);
}

/**
 * Async variant — resolves an attachment to a base64 data URL by reading the file.
 * Only works in a Node.js environment (CLI or server-side rendering).
 */
export async function resolveAttachmentBase64(
  attachmentName: string,
  vaultConfig: VaultConfig,
  noteSourcePath?: string
): Promise<string | null> {
  if (typeof window !== 'undefined') {
    logger(
      'resolveAttachmentBase64: base64 resolution is only available in Node.js'
    );
    return null;
  }

  const nodeModulePath = './attachment-resolver.node';
  const { resolveAttachmentBase64Node } = (await import(
    /* @vite-ignore */ nodeModulePath
  )) as typeof AttachmentResolverNode;

  return resolveAttachmentBase64Node(
    attachmentName,
    vaultConfig,
    noteSourcePath
  );
}
