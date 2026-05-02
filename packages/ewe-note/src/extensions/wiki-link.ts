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
