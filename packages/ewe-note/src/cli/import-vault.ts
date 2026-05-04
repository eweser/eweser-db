#!/usr/bin/env node
/**
 * Purpose: Obsidian vault import manifest CLI and parser.
 * Exports: import types, generateNoteId, processNoteFile, processVaultFile,
 * and import helpers.
 * Touches: User markdown, frontmatter, tags, wiki links, attachments,
 * Canvas/Bases files, and manifest inventory metadata.
 * Read before editing: packages/ewe-note/src/INDEX.md.
 */
/* eslint-disable no-console -- CLI tool: console is the correct output mechanism */

import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile,
} from 'node:fs/promises';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import {
  parseFrontmatter,
  extractTags,
  extractWikiLinks,
} from '@eweser/shared';
import type { FileAttachmentBase } from '@eweser/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ImportedNote {
  /** Stable ID derived from sourcePath — deterministic for idempotent re-import */
  _id: string;
  text: string;
  sourcePath: string;
  sourceVault: string;
  frontmatter: Record<string, unknown>;
  aliases: string[];
  tags: string[];
  wikiLinks: Array<{
    target: string;
    heading?: string;
    alias?: string;
    isEmbed: boolean;
  }>;
  /** Attachment file names referenced in this note */
  attachmentRefs: string[];
}

export type VaultFileCategory =
  | 'image'
  | 'audio'
  | 'video'
  | 'document'
  | 'canvas'
  | 'base'
  | 'binary';

export interface ImportedVaultFile {
  /** Relative path within the vault */
  sourcePath: string;
  /** File name */
  name: string;
  /** File size in bytes */
  size: number;
  /** MIME type guessed from extension */
  mimeType: string;
  /** Broad file family for import/export routing */
  fileCategory: VaultFileCategory;
  /** SHA-256 content hash for round-trip verification */
  contentHash: string;
  /** Absolute source path used for byte-for-byte export when available */
  copySourcePath?: string;
  /** Optional inline bytes for manifests that embed file content */
  contentBase64?: string;
}

export type ImportedAttachment = ImportedVaultFile;

export function vaultFileToAttachmentBase(
  file: ImportedVaultFile,
  options: {
    baseId: string;
    sourceVault?: string;
    parentNoteRefs?: string[];
  }
): FileAttachmentBase {
  const attachment: FileAttachmentBase = {
    baseId: options.baseId,
    sourcePath: file.sourcePath,
    filename: file.name,
    mimeType: file.mimeType,
    size: file.size,
    contentHash: file.contentHash,
    localAvailability: file.copySourcePath ? 'available' : 'unknown',
  };
  if (options.sourceVault) attachment.sourceVault = options.sourceVault;
  if (options.parentNoteRefs)
    attachment.parentNoteRefs = options.parentNoteRefs;
  if (file.copySourcePath) attachment.localPath = file.copySourcePath;
  return attachment;
}

export type VaultSecretRuleId =
  | 'aws-access-key-id'
  | 'aws-secret-access-key'
  | 'generic-credential-assignment'
  | 'github-token'
  | 'openai-api-key'
  | 'private-key-block';

export interface VaultSecretFinding {
  path: string;
  lineNumber: number;
  ruleId: VaultSecretRuleId;
  redactedSnippet: string;
}

export interface VaultInventoryLargestFile {
  sourcePath: string;
  name: string;
  size: number;
  fileCategory: VaultFileCategory | 'text';
}

export interface VaultInventoryReport {
  vaultName: string;
  vaultPath: string;
  scannedAt: string;
  fileCounts: {
    notes: number;
    preservedFiles: number;
    textLikeFiles: number;
    attachments: number;
    skippedPaths: number;
  };
  attachmentCountByExtension: Record<string, number>;
  attachmentCountByMimeFamily: Record<string, number>;
  topLevelFolderCounts: Array<{ folder: string; count: number }>;
  totalBytes: number;
  totalAttachmentBytes: number;
  largestFiles: VaultInventoryLargestFile[];
  secretFindings: VaultSecretFinding[];
  secretFindingCountByRule: Record<string, number>;
  skippedPaths: string[];
}

export interface ScrubbedVaultCopyReport {
  vaultName: string;
  vaultPath: string;
  outputPath: string;
  copiedAt: string;
  includeAttachments: boolean;
  dryRun: boolean;
  fileCounts: {
    copiedNotes: number;
    copiedPreservedFiles: number;
    copiedTextLikeFiles: number;
    copiedAttachments: number;
    skippedSecretTextFiles: number;
    skippedAttachments: number;
    skippedPaths: number;
  };
  skippedSecretPaths: string[];
  skippedAttachmentPaths: string[];
}

export interface VaultImportManifest {
  vaultName: string;
  vaultPath: string;
  importedAt: string;
  notes: ImportedNote[];
  /** Backward-compatible subset for attachment-oriented consumers */
  attachments: ImportedAttachment[];
  /** Full preserved vault inventory for non-note files */
  files: ImportedVaultFile[];
  skippedPaths: string[];
}

interface VaultFileSpec {
  mimeType: string;
  fileCategory: VaultFileCategory;
}

interface ScanDirectoryResult {
  mdFiles: string[];
  preservedFiles: string[];
  textLikeFiles: string[];
  skippedPaths: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const IGNORED_DIRS = new Set(['.obsidian', '.trash', '.git', 'node_modules']);
const NOTE_EXTENSION = '.md';

const VAULT_FILE_SPECS: Record<string, VaultFileSpec> = {
  '.png': { mimeType: 'image/png', fileCategory: 'image' },
  '.jpg': { mimeType: 'image/jpeg', fileCategory: 'image' },
  '.jpeg': { mimeType: 'image/jpeg', fileCategory: 'image' },
  '.gif': { mimeType: 'image/gif', fileCategory: 'image' },
  '.webp': { mimeType: 'image/webp', fileCategory: 'image' },
  '.svg': { mimeType: 'image/svg+xml', fileCategory: 'image' },
  '.avif': { mimeType: 'image/avif', fileCategory: 'image' },
  '.bmp': { mimeType: 'image/bmp', fileCategory: 'image' },
  '.pdf': { mimeType: 'application/pdf', fileCategory: 'document' },
  '.mp3': { mimeType: 'audio/mpeg', fileCategory: 'audio' },
  '.wav': { mimeType: 'audio/wav', fileCategory: 'audio' },
  '.ogg': { mimeType: 'audio/ogg', fileCategory: 'audio' },
  '.flac': { mimeType: 'audio/flac', fileCategory: 'audio' },
  '.m4a': { mimeType: 'audio/mp4', fileCategory: 'audio' },
  '.mp4': { mimeType: 'video/mp4', fileCategory: 'video' },
  '.webm': { mimeType: 'video/webm', fileCategory: 'video' },
  '.ogv': { mimeType: 'video/ogg', fileCategory: 'video' },
  '.3gp': { mimeType: 'video/3gpp', fileCategory: 'video' },
  '.mkv': { mimeType: 'video/x-matroska', fileCategory: 'video' },
  '.mov': { mimeType: 'video/quicktime', fileCategory: 'video' },
  '.canvas': { mimeType: 'application/json', fileCategory: 'canvas' },
  '.base': { mimeType: 'text/yaml', fileCategory: 'base' },
};

const ATTACHMENT_CATEGORIES = new Set<VaultFileCategory>([
  'image',
  'audio',
  'video',
  'document',
]);

const ATTACHMENT_EXTENSIONS = new Set(
  Object.entries(VAULT_FILE_SPECS)
    .filter(([, spec]) => ATTACHMENT_CATEGORIES.has(spec.fileCategory))
    .map(([ext]) => ext)
);

const PRESERVED_FILE_EXTENSIONS = new Set(Object.keys(VAULT_FILE_SPECS));

const TEXT_SCAN_EXTENSIONS = new Set([
  '.md',
  '.canvas',
  '.base',
  '.txt',
  '.json',
  '.jsonc',
  '.yaml',
  '.yml',
  '.csv',
  '.toml',
  '.ini',
  '.org',
  '.rst',
  '.xml',
  '.html',
  '.css',
  '.scss',
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.svg',
]);

const SECRET_RULES: Array<{
  ruleId: VaultSecretRuleId;
  pattern: RegExp;
}> = [
  {
    ruleId: 'aws-access-key-id',
    pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/,
  },
  {
    ruleId: 'aws-secret-access-key',
    pattern: /\baws_secret_access_key\s*[:=]\s*["']?[^"'`\s,}]+/i,
  },
  {
    ruleId: 'generic-credential-assignment',
    pattern:
      /\b(?:api[_-]?key|secret|token|password|access[_-]?key)\b\s*[:=]\s*["']?[^"'`\s,}]+/i,
  },
  {
    ruleId: 'github-token',
    pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b/,
  },
  {
    ruleId: 'openai-api-key',
    pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/,
  },
  {
    ruleId: 'private-key-block',
    pattern:
      /-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/,
  },
];

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

/**
 * Generate a stable, deterministic ID from vault name + source path.
 * Using SHA-256 truncated to 16 hex chars for readability.
 */
export function generateNoteId(vaultName: string, sourcePath: string): string {
  return createHash('sha256')
    .update(`${vaultName}:${sourcePath}`)
    .digest('hex')
    .slice(0, 16);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toVaultRelativePath(rootPath: string, filePath: string): string {
  return relative(rootPath, filePath).replace(/\\/g, '/');
}

function getVaultFileSpec(filePath: string): VaultFileSpec | undefined {
  return VAULT_FILE_SPECS[extname(filePath).toLowerCase()];
}

function isImportedAttachment(file: ImportedVaultFile): boolean {
  return ATTACHMENT_CATEGORIES.has(file.fileCategory);
}

export function isAttachmentFilePath(filePath: string): boolean {
  return ATTACHMENT_EXTENSIONS.has(extname(filePath).toLowerCase());
}

function hashBuffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

function clonePattern(pattern: RegExp): RegExp {
  return new RegExp(pattern.source, pattern.flags);
}

function scanSecretFindings(
  text: string,
  relPath: string
): VaultSecretFinding[] {
  const findings: VaultSecretFinding[] = [];
  const lines = text.split(/\r?\n/);
  const seen = new Set<string>();

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    for (const rule of SECRET_RULES) {
      if (!clonePattern(rule.pattern).test(line)) continue;
      const key = `${relPath}:${index + 1}:${rule.ruleId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      findings.push({
        path: relPath,
        lineNumber: index + 1,
        ruleId: rule.ruleId,
        redactedSnippet:
          rule.ruleId === 'private-key-block'
            ? '[REDACTED_PRIVATE_KEY_BLOCK]'
            : '[REDACTED_SECRET]',
      });
    }
  }

  for (const rule of SECRET_RULES) {
    if (rule.ruleId !== 'private-key-block') continue;
    const match = clonePattern(rule.pattern).exec(text);
    if (!match || match.index === undefined) continue;
    const before = text.slice(0, match.index);
    const lineNumber = before.split(/\r?\n/).length;
    const key = `${relPath}:${lineNumber}:${rule.ruleId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    findings.push({
      path: relPath,
      lineNumber,
      ruleId: rule.ruleId,
      redactedSnippet: '[REDACTED_PRIVATE_KEY_BLOCK]',
    });
  }

  return findings;
}

function topLevelFolderForPath(relPath: string): string {
  if (!relPath.includes('/')) return '(root)';
  const [firstSegment] = relPath.split('/');
  return firstSegment && firstSegment.length > 0 ? firstSegment : '(root)';
}

function mimeFamilyFor(mimeType: string): string {
  return mimeType.includes('/')
    ? (mimeType.split('/')[0] ?? 'unknown')
    : 'unknown';
}

// ---------------------------------------------------------------------------
// File scanning
// ---------------------------------------------------------------------------

async function scanDirectory(
  dir: string,
  vaultRoot: string
): Promise<ScanDirectoryResult> {
  const mdFiles: string[] = [];
  const preservedFiles: string[] = [];
  const textLikeFiles: string[] = [];
  const skippedPaths: string[] = [];

  async function recurse(currentDir: string): Promise<void> {
    let entries: string[];
    try {
      entries = await readdir(currentDir);
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const relPath = toVaultRelativePath(vaultRoot, fullPath);

      if (IGNORED_DIRS.has(entry)) {
        skippedPaths.push(relPath);
        continue;
      }

      let fileStat;
      try {
        fileStat = await stat(fullPath);
      } catch {
        skippedPaths.push(relPath);
        continue;
      }

      if (fileStat.isDirectory()) {
        await recurse(fullPath);
        continue;
      }

      const ext = extname(entry).toLowerCase();
      if (ext === NOTE_EXTENSION) {
        mdFiles.push(fullPath);
      } else if (PRESERVED_FILE_EXTENSIONS.has(ext)) {
        preservedFiles.push(fullPath);
      } else if (TEXT_SCAN_EXTENSIONS.has(ext)) {
        textLikeFiles.push(fullPath);
      } else {
        skippedPaths.push(relPath);
      }
    }
  }

  await recurse(dir);
  return { mdFiles, preservedFiles, textLikeFiles, skippedPaths };
}

// ---------------------------------------------------------------------------
// Note processing
// ---------------------------------------------------------------------------

export async function processNoteFile(
  filePath: string,
  vaultRoot: string,
  vaultName: string
): Promise<ImportedNote> {
  const rawContent = await readFile(filePath, 'utf-8');
  const relPath = toVaultRelativePath(vaultRoot, filePath);
  const { frontmatter, content } = parseFrontmatter(rawContent);

  const tags = extractTags(content);
  const fmTags = frontmatter.tags;
  if (Array.isArray(fmTags)) {
    for (const tag of fmTags) {
      if (typeof tag === 'string' && !tags.includes(tag)) {
        tags.push(tag);
      }
    }
  }

  const wikiLinks = extractWikiLinks(content);
  const aliases: string[] = [];
  const fmAliases = frontmatter.aliases;
  if (Array.isArray(fmAliases)) {
    for (const alias of fmAliases) {
      if (typeof alias === 'string') aliases.push(alias);
    }
  }

  const attachmentRefs: string[] = [];
  for (const link of wikiLinks) {
    if (!link.isEmbed || !link.target) continue;
    const ext = extname(link.target).toLowerCase();
    if (ATTACHMENT_EXTENSIONS.has(ext)) {
      attachmentRefs.push(link.target);
    }
  }

  return {
    _id: generateNoteId(vaultName, relPath),
    text: content,
    sourcePath: relPath,
    sourceVault: vaultName,
    frontmatter,
    aliases,
    tags,
    wikiLinks: wikiLinks.map(({ target, heading, alias, isEmbed }) => {
      const entry: {
        target: string;
        heading?: string;
        alias?: string;
        isEmbed: boolean;
      } = { target, isEmbed };
      if (heading !== undefined) entry.heading = heading;
      if (alias !== undefined) entry.alias = alias;
      return entry;
    }),
    attachmentRefs,
  };
}

// ---------------------------------------------------------------------------
// Non-note file processing
// ---------------------------------------------------------------------------

export async function processVaultFile(
  filePath: string,
  vaultRoot: string
): Promise<ImportedVaultFile> {
  const relPath = toVaultRelativePath(vaultRoot, filePath);
  const spec = getVaultFileSpec(filePath);
  const bytes = await readFile(filePath);
  const fileStat = await stat(filePath);

  return {
    sourcePath: relPath,
    name: basename(filePath),
    size: fileStat.size,
    mimeType: spec?.mimeType ?? 'application/octet-stream',
    fileCategory: spec?.fileCategory ?? 'binary',
    contentHash: hashBuffer(bytes),
    copySourcePath: filePath,
  };
}

export async function inventoryVault(options: {
  vaultPath: string;
  vaultName: string;
}): Promise<VaultInventoryReport> {
  const { vaultPath, vaultName } = options;

  console.log(`Inventorying vault: ${vaultPath}`);
  const scanResult = await scanDirectory(vaultPath, vaultPath);

  const fileCounts = {
    notes: 0,
    preservedFiles: 0,
    textLikeFiles: 0,
    attachments: 0,
    skippedPaths: scanResult.skippedPaths.length,
  };
  const attachmentCountByExtension: Record<string, number> = {};
  const attachmentCountByMimeFamily: Record<string, number> = {};
  const topLevelFolderCounts = new Map<string, number>();
  const secretFindings: VaultSecretFinding[] = [];
  const largestFiles: VaultInventoryLargestFile[] = [];
  let totalBytes = 0;
  let totalAttachmentBytes = 0;

  const recordLargestFile = (
    sourcePath: string,
    name: string,
    size: number,
    fileCategory: VaultInventoryLargestFile['fileCategory']
  ) => {
    largestFiles.push({ sourcePath, name, size, fileCategory });
    largestFiles.sort(
      (a, b) => b.size - a.size || a.sourcePath.localeCompare(b.sourcePath)
    );
    if (largestFiles.length > 10) largestFiles.length = 10;
  };

  const bumpTopLevelFolder = (relPath: string) => {
    const folder = topLevelFolderForPath(relPath);
    topLevelFolderCounts.set(
      folder,
      (topLevelFolderCounts.get(folder) ?? 0) + 1
    );
  };

  const scanTextFile = async (filePath: string, relPath: string) => {
    const content = await readFile(filePath, 'utf-8');
    secretFindings.push(...scanSecretFindings(content, relPath));
  };

  for (const filePath of scanResult.mdFiles) {
    const relPath = toVaultRelativePath(vaultPath, filePath);
    const fileStat = await stat(filePath);
    totalBytes += fileStat.size;
    fileCounts.notes += 1;
    bumpTopLevelFolder(relPath);
    recordLargestFile(relPath, basename(filePath), fileStat.size, 'text');
    await scanTextFile(filePath, relPath);
  }

  for (const filePath of scanResult.preservedFiles) {
    const relPath = toVaultRelativePath(vaultPath, filePath);
    const fileStat = await stat(filePath);
    const spec = getVaultFileSpec(filePath);
    const fileCategory = spec?.fileCategory ?? 'binary';

    totalBytes += fileStat.size;
    fileCounts.preservedFiles += 1;
    bumpTopLevelFolder(relPath);
    recordLargestFile(relPath, basename(filePath), fileStat.size, fileCategory);

    if (ATTACHMENT_CATEGORIES.has(fileCategory)) {
      fileCounts.attachments += 1;
      totalAttachmentBytes += fileStat.size;
      const ext = extname(filePath).toLowerCase() || '(none)';
      attachmentCountByExtension[ext] =
        (attachmentCountByExtension[ext] ?? 0) + 1;
      const family = spec?.mimeType ? mimeFamilyFor(spec.mimeType) : 'unknown';
      attachmentCountByMimeFamily[family] =
        (attachmentCountByMimeFamily[family] ?? 0) + 1;
      continue;
    }

    if (TEXT_SCAN_EXTENSIONS.has(extname(filePath).toLowerCase())) {
      fileCounts.textLikeFiles += 1;
      await scanTextFile(filePath, relPath);
    }
  }

  for (const filePath of scanResult.textLikeFiles) {
    const relPath = toVaultRelativePath(vaultPath, filePath);
    const fileStat = await stat(filePath);
    totalBytes += fileStat.size;
    fileCounts.textLikeFiles += 1;
    bumpTopLevelFolder(relPath);
    recordLargestFile(relPath, basename(filePath), fileStat.size, 'text');
    await scanTextFile(filePath, relPath);
  }

  const secretFindingCountByRule = secretFindings.reduce<
    Record<string, number>
  >((counts, finding) => {
    counts[finding.ruleId] = (counts[finding.ruleId] ?? 0) + 1;
    return counts;
  }, {});

  const report: VaultInventoryReport = {
    vaultName,
    vaultPath,
    scannedAt: new Date().toISOString(),
    fileCounts,
    attachmentCountByExtension,
    attachmentCountByMimeFamily,
    topLevelFolderCounts: Array.from(topLevelFolderCounts.entries())
      .map(([folder, count]) => ({ folder, count }))
      .sort((a, b) => b.count - a.count || a.folder.localeCompare(b.folder)),
    totalBytes,
    totalAttachmentBytes,
    largestFiles,
    secretFindings,
    secretFindingCountByRule,
    skippedPaths: [...new Set(scanResult.skippedPaths)].sort(),
  };

  console.log(
    `Inventory complete: ${report.fileCounts.notes} notes, ${report.fileCounts.attachments} attachments, ${report.secretFindings.length} secret-risk findings`
  );

  return report;
}

export async function createScrubbedVaultCopy(options: {
  vaultPath: string;
  vaultName: string;
  outputPath: string;
  includeAttachments?: boolean;
  dryRun?: boolean;
}): Promise<ScrubbedVaultCopyReport> {
  const { vaultPath, vaultName } = options;
  const outputPath = resolve(options.outputPath);
  const sourcePath = resolve(vaultPath);
  const includeAttachments = options.includeAttachments ?? false;
  const dryRun = options.dryRun ?? false;

  if (
    outputPath === sourcePath ||
    outputPath.startsWith(`${sourcePath}/`) ||
    outputPath.startsWith(`${sourcePath}\\`)
  ) {
    throw new Error(
      'Scrubbed copy output must be outside the source vault path.'
    );
  }

  const scanResult = await scanDirectory(vaultPath, vaultPath);
  const inventory = await inventoryVault({ vaultPath, vaultName });
  const secretPaths = new Set(
    inventory.secretFindings.map((finding) => finding.path)
  );

  const report: ScrubbedVaultCopyReport = {
    vaultName,
    vaultPath,
    outputPath,
    copiedAt: new Date().toISOString(),
    includeAttachments,
    dryRun,
    fileCounts: {
      copiedNotes: 0,
      copiedPreservedFiles: 0,
      copiedTextLikeFiles: 0,
      copiedAttachments: 0,
      skippedSecretTextFiles: 0,
      skippedAttachments: 0,
      skippedPaths: scanResult.skippedPaths.length,
    },
    skippedSecretPaths: [],
    skippedAttachmentPaths: [],
  };

  const copyVaultFile = async (relPath: string, filePath: string) => {
    report.fileCounts.copiedPreservedFiles += 1;
    if (dryRun) return;
    const destPath = join(outputPath, relPath);
    await mkdir(dirname(destPath), { recursive: true });
    await copyFile(filePath, destPath);
  };

  for (const filePath of scanResult.mdFiles) {
    const relPath = toVaultRelativePath(vaultPath, filePath);
    if (secretPaths.has(relPath)) {
      report.fileCounts.skippedSecretTextFiles += 1;
      report.skippedSecretPaths.push(relPath);
      continue;
    }
    report.fileCounts.copiedNotes += 1;
    await copyVaultFile(relPath, filePath);
  }

  for (const filePath of scanResult.preservedFiles) {
    const relPath = toVaultRelativePath(vaultPath, filePath);
    const spec = getVaultFileSpec(filePath);
    const fileCategory = spec?.fileCategory ?? 'binary';

    if (ATTACHMENT_CATEGORIES.has(fileCategory)) {
      if (!includeAttachments) {
        report.fileCounts.skippedAttachments += 1;
        report.skippedAttachmentPaths.push(relPath);
        continue;
      }
      report.fileCounts.copiedAttachments += 1;
      await copyVaultFile(relPath, filePath);
      continue;
    }

    if (secretPaths.has(relPath)) {
      report.fileCounts.skippedSecretTextFiles += 1;
      report.skippedSecretPaths.push(relPath);
      continue;
    }

    await copyVaultFile(relPath, filePath);
  }

  for (const filePath of scanResult.textLikeFiles) {
    const relPath = toVaultRelativePath(vaultPath, filePath);
    if (secretPaths.has(relPath)) {
      report.fileCounts.skippedSecretTextFiles += 1;
      report.skippedSecretPaths.push(relPath);
      continue;
    }
    report.fileCounts.copiedTextLikeFiles += 1;
    await copyVaultFile(relPath, filePath);
  }

  report.skippedSecretPaths.sort();
  report.skippedAttachmentPaths.sort();

  console.log(
    [
      `Scrubbed copy ready: ${report.fileCounts.copiedNotes} notes copied`,
      `${report.fileCounts.skippedSecretTextFiles} secret-flagged text files skipped`,
      `${report.fileCounts.skippedAttachments} attachments skipped`,
    ].join(', ')
  );

  return report;
}

// ---------------------------------------------------------------------------
// Main import function
// ---------------------------------------------------------------------------

export async function importVault(options: {
  vaultPath: string;
  vaultName: string;
  outputPath?: string;
  dryRun?: boolean;
}): Promise<VaultImportManifest> {
  const { vaultPath, vaultName, outputPath, dryRun = false } = options;

  console.log(`Scanning vault: ${vaultPath}`);
  const scanResult = await scanDirectory(vaultPath, vaultPath);
  console.log(
    `Found ${scanResult.mdFiles.length} notes, ${scanResult.preservedFiles.length} preserved files`
  );

  const notes: ImportedNote[] = [];
  const files: ImportedVaultFile[] = [];
  const skippedPaths = [...scanResult.skippedPaths];

  for (const filePath of scanResult.mdFiles) {
    try {
      notes.push(await processNoteFile(filePath, vaultPath, vaultName));
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`Skipping ${filePath}: ${errMsg}`);
      skippedPaths.push(toVaultRelativePath(vaultPath, filePath));
    }
  }

  for (const filePath of scanResult.preservedFiles) {
    try {
      files.push(await processVaultFile(filePath, vaultPath));
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`Skipping file ${filePath}: ${errMsg}`);
      skippedPaths.push(toVaultRelativePath(vaultPath, filePath));
    }
  }

  const attachments = files.filter(isImportedAttachment);

  const manifest: VaultImportManifest = {
    vaultName,
    vaultPath,
    importedAt: new Date().toISOString(),
    notes,
    attachments,
    files,
    skippedPaths: [...new Set(skippedPaths)].sort(),
  };

  if (!dryRun && outputPath) {
    await writeFile(outputPath, JSON.stringify(manifest, null, 2), 'utf-8');
    console.log(`Manifest written to: ${outputPath}`);
  }

  console.log(
    `Import complete: ${notes.length} notes, ${files.length} preserved files imported from vault "${vaultName}"`
  );

  if (manifest.skippedPaths.length > 0) {
    console.warn(
      `Skipped ${manifest.skippedPaths.length} paths by policy or due to errors`
    );
  }

  return manifest;
}

// ---------------------------------------------------------------------------
// CLI entry
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const getArg = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : undefined;
  };

  const vaultPath = getArg('--vault');
  const vaultName = getArg('--name') ?? 'My Vault';
  const outputPath = getArg('--output') ?? './vault-import.json';
  const dryRun = args.includes('--dry-run');
  const inventoryOnly =
    args.includes('--inventory-only') || args.includes('--no-content');
  const scrubbedCopyPath = getArg('--scrubbed-copy');
  const includeAttachments = args.includes('--include-attachments');

  if (!vaultPath) {
    console.error(
      [
        'Usage: npx tsx import-vault.ts --vault /path/to/vault',
        '  [--name "Vault Name"] [--output ./out.json] [--dry-run]',
        '  [--inventory-only|--no-content]',
        '  [--scrubbed-copy /path/to/output-copy] [--include-attachments]',
      ].join('\n')
    );
    process.exit(1);
  }

  if (inventoryOnly) {
    const report = await inventoryVault({ vaultPath, vaultName });
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  if (scrubbedCopyPath) {
    const report = await createScrubbedVaultCopy({
      vaultPath,
      vaultName,
      outputPath: scrubbedCopyPath,
      includeAttachments,
      dryRun,
    });
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  await importVault({ vaultPath, vaultName, outputPath, dryRun });
}

if (process.argv[1] && process.argv[1].endsWith('import-vault.ts')) {
  main().catch((err) => {
    console.error('Import failed:', err);
    process.exit(1);
  });
}
