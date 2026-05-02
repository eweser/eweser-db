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

/** Common Obsidian attachment folder names to search */
const ATTACHMENT_FOLDERS = [
  'Attachments',
  'attachments',
  'assets',
  'files',
  '_attachments',
];

/**
 * Resolve an attachment name to all candidate paths relative to vault root.
 * Returns paths in order of priority.
 */
export function getAttachmentCandidates(
  attachmentName: string,
  noteSourcePath?: string
): string[] {
  const candidates: string[] = [];

  // 1. Exact path as given (e.g. "Attachments/image.png")
  candidates.push(attachmentName);

  // 2. Common attachment folders
  for (const folder of ATTACHMENT_FOLDERS) {
    candidates.push(`${folder}/${attachmentName}`);
  }

  // 3. Same folder as note (if source path known)
  if (noteSourcePath) {
    const noteDir = noteSourcePath.split('/').slice(0, -1).join('/');
    if (noteDir) {
      candidates.push(`${noteDir}/${attachmentName}`);
    }
    // Also check attachment folders relative to note's parent
    for (const folder of ATTACHMENT_FOLDERS) {
      if (noteDir) {
        candidates.push(`${noteDir}/${folder}/${attachmentName}`);
      }
    }
  }

  // 4. Vault root
  const baseName = attachmentName.split('/').pop() ?? attachmentName;
  if (baseName !== attachmentName) {
    candidates.push(baseName);
  }

  // Deduplicate preserving order
  return Array.from(new Set(candidates));
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
  const primaryCandidate = candidates[0] ?? attachmentName;

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
