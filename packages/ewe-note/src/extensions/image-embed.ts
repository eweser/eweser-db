/**
 * Image embed extension for Obsidian Flavored Markdown.
 *
 * Handles ![[image.png]], ![[image.png|300]], ![[image.png|640x480]]
 *
 * At the serialization layer:
 *   - On load: ![[image.png|300]] → ![image.png](vault://image.png) with data-width="300"
 *   - On save: ![image.png](vault://image.png) → ![[image.png]]
 *
 * Actual image URL resolution is done by the attachment-resolver utility.
 */

export interface ImageEmbedOptions {
  /** Original file path within the vault, e.g. "Attachments/photo.png" */
  sourcePath: string;
  /** Display width in pixels (if specified via |300 syntax) */
  width?: number;
  /** Display height in pixels (if specified via |640x480 syntax) */
  height?: number;
}

export interface ParsedImageEmbed {
  /** Attachment target as written inside the embed, without dimension alias. */
  target: string;
  /** Raw pipe alias, if present. Obsidian uses numeric aliases for dimensions. */
  alias?: string;
  /** Display width in pixels (if specified via |300 or |640x480 syntax). */
  width?: number;
  /** Display height in pixels (if specified via |640x480 syntax). */
  height?: number;
  /** Original Obsidian source string, preserving the user's target spelling. */
  originalSource: string;
}

const IMAGE_EXTENSIONS = new Set([
  '.avif',
  '.bmp',
  '.gif',
  '.jpeg',
  '.jpg',
  '.png',
  '.svg',
  '.webp',
]);

/**
 * Parse Obsidian image embed syntax alias to extract dimension hints.
 *
 * Obsidian uses the pipe position (alias) for dimensions:
 *   ![[img.png|300]]      → width: 300
 *   ![[img.png|640x480]]  → width: 640, height: 480
 *   ![[img.png|My Image]] → no dimensions (treat as alt text only)
 */
export function parseImageDimensions(alias: string | undefined): {
  width?: number;
  height?: number;
} {
  if (!alias) return {};

  // Match "WxH" pattern
  const whMatch = alias.match(/^(\d+)x(\d+)$/);
  if (whMatch) {
    return { width: Number(whMatch[1]), height: Number(whMatch[2]) };
  }

  // Match single number
  const wMatch = alias.match(/^(\d+)$/);
  if (wMatch) {
    return { width: Number(wMatch[1]) };
  }

  return {};
}

export function isImagePath(path: string): boolean {
  const cleanPath = path.split(/[?#]/, 1)[0] ?? path;
  const lastDot = cleanPath.lastIndexOf('.');
  if (lastDot === -1) return false;
  return IMAGE_EXTENSIONS.has(cleanPath.slice(lastDot).toLowerCase());
}

/**
 * Parse the inner text of an Obsidian image embed.
 *
 * Examples:
 *   image.png          → target image.png
 *   image.png|300      → target image.png, width 300
 *   image.png|640x480  → target image.png, width 640, height 480
 */
export function parseImageEmbed(raw: string): ParsedImageEmbed | null {
  const normalized = raw.trim();
  if (!normalized) return null;

  const [rawTarget = '', ...aliasParts] = normalized.split('|');
  const target = rawTarget.trim();
  if (!target) return null;

  const alias = aliasParts.join('|').trim() || undefined;
  const dimensions = parseImageDimensions(alias);

  return {
    target,
    ...(alias ? { alias } : {}),
    ...dimensions,
    originalSource: `![[${normalized}]]`,
  };
}

/**
 * Generate an OFM image embed string from options.
 */
export function toImageEmbedSyntax(options: ImageEmbedOptions): string {
  const { sourcePath, width, height } = options;
  if (width && height) {
    return `![[${sourcePath}|${width}x${height}]]`;
  }
  if (width) {
    return `![[${sourcePath}|${width}]]`;
  }
  return `![[${sourcePath}]]`;
}
