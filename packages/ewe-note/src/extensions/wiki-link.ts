/**
 * Wiki-link extension for Obsidian Flavored Markdown.
 *
 * Wiki-links are handled at the serialization layer:
 *   - On load: [[Note]] → [Note](wiki://Note) via ofmToMarkdown()
 *   - On save: [Note](wiki://Note) → [[Note]] via markdownToOfm()
 *
 * This module provides the React rendering component for wiki-link anchors
 * and the navigation handler, used when rendering links with wiki:// scheme.
 */

import {
  findAttachmentForTarget,
  resolveAttachmentEmbed,
  type AttachmentResolverContext,
} from '../utils/attachment-resolver';

export interface WikiLinkResolution {
  noteId: string | null;
  noteName: string;
  heading?: string;
  blockRef?: string;
}

/**
 * Parse a wiki:// href back to its components.
 * wiki://Note%20Name#Heading → { noteName: "Note Name", heading: "Heading" }
 */
export function parseWikiHref(href: string): WikiLinkResolution | null {
  if (!href.startsWith('wiki://')) return null;

  const withoutScheme = href.slice('wiki://'.length);
  const [encodedTarget, encodedHeading] = withoutScheme.split('#');
  const noteName = decodeURIComponent(encodedTarget ?? '');
  const heading = encodedHeading
    ? decodeURIComponent(encodedHeading)
    : undefined;
  const blockRef = heading?.startsWith('^') ? heading.slice(1) : undefined;
  const noteHeading = heading?.startsWith('^') ? undefined : heading;

  const result: WikiLinkResolution = {
    noteId: null,
    noteName,
    heading: noteHeading,
  };
  if (blockRef !== undefined) {
    result.blockRef = blockRef;
  }
  return result;
}

/**
 * Determine if a URL is a wiki-link.
 */
export function isWikiLink(href: string): boolean {
  return href.startsWith('wiki://');
}

/**
 * Determine if a URL is a vault asset link.
 */
export function isVaultAsset(href: string): boolean {
  return href.startsWith('vault://');
}

/**
 * Parse a vault:// href back to the asset path.
 * vault://Attachments%2Fimage.png → "Attachments/image.png"
 */
export function parseVaultAssetHref(href: string): string | null {
  if (!href.startsWith('vault://')) return null;
  return decodeURIComponent(href.slice('vault://'.length));
}

export type LinkTarget =
  | { kind: 'note' }
  | { kind: 'missing-note' }
  | { kind: 'attachment'; url: string | null };

export interface LinkTargetResolvers {
  /** Returns true when a note exists for the wiki target. Omit to treat every target as existing. */
  isNoteResolved?: (noteName: string) => boolean;
  attachmentContext?: AttachmentResolverContext;
}

function resolveAttachmentTarget(
  path: string,
  attachmentContext: AttachmentResolverContext | undefined
): LinkTarget | null {
  if (!attachmentContext) return null;
  if (!findAttachmentForTarget(path, attachmentContext)) return null;
  const resolution = resolveAttachmentEmbed(path, attachmentContext);
  return {
    kind: 'attachment',
    url: resolution.status === 'resolved' ? resolution.url : null,
  };
}

/**
 * Classify an internal link href. Returns null for hrefs that are not
 * wiki:// or vault:// links.
 */
export function classifyInternalHref(
  href: string,
  { isNoteResolved, attachmentContext }: LinkTargetResolvers
): LinkTarget | null {
  const vaultPath = parseVaultAssetHref(href);
  if (vaultPath !== null) {
    return (
      resolveAttachmentTarget(vaultPath, attachmentContext) ?? {
        kind: 'attachment',
        url: null,
      }
    );
  }

  const wiki = parseWikiHref(href);
  if (!wiki) return null;
  // [[#Heading]] points at the current note.
  if (!wiki.noteName || !isNoteResolved) return { kind: 'note' };
  if (isNoteResolved(wiki.noteName)) return { kind: 'note' };
  return (
    resolveAttachmentTarget(wiki.noteName, attachmentContext) ?? {
      kind: 'missing-note',
    }
  );
}
