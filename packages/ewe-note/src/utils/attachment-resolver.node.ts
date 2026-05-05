import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  getAttachmentCandidates,
  type VaultConfig,
} from './attachment-resolver';

const MIME_MAP: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};

export async function resolveAttachmentBase64Node(
  attachmentName: string,
  vaultConfig: VaultConfig,
  noteSourcePath?: string
): Promise<string | null> {
  const candidates = getAttachmentCandidates(attachmentName, noteSourcePath);

  for (const candidate of candidates) {
    const fullPath = join(vaultConfig.vaultPath, candidate);
    try {
      await access(fullPath);
      const data = await readFile(fullPath);
      const ext = candidate.split('.').pop()?.toLowerCase() ?? 'png';
      const mime = MIME_MAP[ext] ?? 'application/octet-stream';
      return `data:${mime};base64,${data.toString('base64')}`;
    } catch {
      // File not found at this path, try next.
    }
  }

  return null;
}
