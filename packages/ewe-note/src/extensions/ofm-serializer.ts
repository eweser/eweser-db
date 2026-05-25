/**
 * OFM (Obsidian Flavored Markdown) Serializer / Deserializer
 *
 * Converts between editor-compatible markdown and Obsidian Flavored Markdown.
 * Handles OFM-specific syntax that the active editor does not natively store:
 *   - Wiki links: [[Note Name]] and [[Note Name|Alias]]
 *   - Highlights: ==text==
 *   - Comments: %%text%%
 *   - Callouts: > [!type] Title
 *   - Image embeds: ![[image.png|300]]
 *   - Tags: #tag (preserved as-is)
 */

import { parseImageEmbed } from './image-embed';
import {
  isResolvableImageTarget,
  normalizeAttachmentResolverContext,
  resolveAttachmentEmbed,
  type AttachmentResolverContext,
  type ResolvedAttachmentEmbed,
  type VaultConfig,
} from '../utils/attachment-resolver';

// ---------------------------------------------------------------------------
// Pre-processing: OFM -> Standard Markdown (for import into the editor)
// ---------------------------------------------------------------------------

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function attr(name: string, value: string | number | undefined): string {
  if (value === undefined || value === '') return '';
  return ` ${name}="${escapeHtml(String(value))}"`;
}

function renderResolvedImage(resolution: ResolvedAttachmentEmbed): string {
  return `<img${attr('src', resolution.url)}${attr(
    'alt',
    resolution.filename
  )}${attr('data-ewe-attachment-source', resolution.sourcePath)}${attr(
    'data-ewe-ofm-source',
    resolution.originalSource
  )}${attr('width', resolution.width)}${attr('height', resolution.height)} />`;
}

function renderMissingImage(
  originalSource: string,
  target: string,
  width?: number,
  height?: number
): string {
  return `<span class="ewe-broken-attachment" data-ewe-broken-attachment="true"${attr(
    'data-ewe-ofm-source',
    originalSource
  )}${attr('data-ewe-attachment-target', target)}${attr('data-width', width)}${attr(
    'data-height',
    height
  )} title="Attachment not found">${escapeHtml(originalSource)}</span>`;
}

function hasAttachmentResolutionInput(
  context: AttachmentResolverContext
): boolean {
  return Boolean(
    Object.prototype.hasOwnProperty.call(context, 'attachments') ||
    context.attachmentUrls ||
    context.vaultConfig
  );
}

/**
 * Transform OFM-specific syntax into editor-compatible markdown
 * before passing to tryParseMarkdownToBlocks().
 *
 * @param ofm - Obsidian Flavored Markdown source
 * @param context - Optional vault config or imported attachment metadata for resolving attachment URLs
 * @param noteSourcePath - Optional note source path for relative attachment resolution
 */
export function ofmToMarkdown(
  ofm: string,
  context?: VaultConfig | AttachmentResolverContext,
  noteSourcePath?: string
): string {
  const attachmentContext = normalizeAttachmentResolverContext(
    context,
    noteSourcePath
  );
  let result = ofm;

  // Preserve block comments %%...%% as plain text for source fidelity.

  // Render imported image embeds when their attachment metadata is available,
  // but leave non-media note embeds as OFM source text to avoid data loss.
  result = result.replace(/!\[\[([^\]]+)\]\]/g, (_match, raw: string) => {
    const parsed = parseImageEmbed(String(raw));
    if (!parsed) return `![[${String(raw).trim()}]]`;

    if (!hasAttachmentResolutionInput(attachmentContext)) {
      return parsed.originalSource;
    }

    if (!isResolvableImageTarget(parsed.target, attachmentContext)) {
      return parsed.originalSource;
    }

    const resolution = resolveAttachmentEmbed(parsed.target, {
      ...attachmentContext,
      originalSource: parsed.originalSource,
      ...(parsed.width ? { width: parsed.width } : {}),
      ...(parsed.height ? { height: parsed.height } : {}),
    });

    if (resolution.status === 'resolved') {
      return renderResolvedImage(resolution);
    }

    return renderMissingImage(
      resolution.originalSource,
      resolution.target,
      resolution.width,
      resolution.height
    );
  });

  // Wiki links with alias: [[Note Name|Alias]] → [Alias](wiki://Note Name)
  result = result.replace(
    /(?<!!)\[\[([^\]|#]+?)(?:#([^\]|]*))?\|([^\]]+)\]\]/g,
    (_match, target: string, heading: string | undefined, alias: string) => {
      const href = heading
        ? `wiki://${encodeURIComponent(target.trim())}#${encodeURIComponent(heading.trim())}`
        : `wiki://${encodeURIComponent(target.trim())}`;
      return `[${alias.trim()}](${href})`;
    }
  );

  // Wiki links without alias: [[Note Name#Heading]] → [Note Name § Heading](wiki://Note Name#Heading)
  result = result.replace(
    /(?<!!)\[\[([^\]|#]*?)(?:#([^\]|]*))?\]\]/g,
    (_match, target: string, heading: string | undefined) => {
      const label = heading
        ? `${target.trim()} § ${heading.trim()}`
        : target.trim() || heading?.trim() || 'link';
      const href = heading
        ? `wiki://${encodeURIComponent(target.trim())}#${encodeURIComponent(heading.trim())}`
        : `wiki://${encodeURIComponent(target.trim())}`;
      return `[${label}](${href})`;
    }
  );

  return result;
}

// ---------------------------------------------------------------------------
// Post-processing: Standard Markdown -> OFM
// ---------------------------------------------------------------------------

function decodeHtmlAttribute(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function getHtmlAttribute(tag: string, name: string): string | undefined {
  const match = tag.match(new RegExp(`${name}=["']([^"']+)["']`, 'i'));
  return match ? decodeHtmlAttribute(match[1]) : undefined;
}

function isObsidianEmbedSource(value: string | undefined): value is string {
  return Boolean(value?.startsWith('![[') && value.endsWith(']]'));
}

/**
 * Transform serialized markdown back to OFM syntax.
 *
 * Reverses ofmToMarkdown() transformations:
 *   [Note Name](wiki://Note Name)         → [[Note Name]]
 *   [Alias](wiki://Note Name)             → [[Note Name|Alias]]
 *   ![name](vault://name)                 → [[name]]
 */
export function markdownToOfm(markdown: string): string {
  let result = markdown;

  result = result.replace(/<img\b([^>]*)>/gi, (match, attrs: string) => {
    const originalSource = getHtmlAttribute(attrs, 'data-ewe-ofm-source');
    if (isObsidianEmbedSource(originalSource)) return originalSource;
    return match;
  });

  result = result.replace(
    /<span\b([^>]*)data-ewe-broken-attachment=["']true["']([^>]*)>([\s\S]*?)<\/span>/gi,
    (match, beforeAttrs: string, afterAttrs: string, body: string) => {
      const attrs = `${beforeAttrs} ${afterAttrs}`;
      const originalSource = getHtmlAttribute(attrs, 'data-ewe-ofm-source');
      if (isObsidianEmbedSource(originalSource)) return originalSource;
      const bodyText = body.replace(/<[^>]+>/g, '').trim();
      return isObsidianEmbedSource(bodyText) ? bodyText : match;
    }
  );

  // Back-compat for markdown image links written without a metadata token.
  result = result.replace(
    /!\[([^\]]*)\]\(vault:\/\/([^ )]+)\)/g,
    (_match, alt: string, encoded: string) => {
      const path = decodeURIComponent(encoded);
      const name = alt.trim() || path.split('/').pop();
      return `![[${name}]]`;
    }
  );

  // Wiki links with heading + alias: [Alias § Heading](wiki://Target#Heading) — not easily reversible
  // Wiki links with alias: [Alias](wiki://Target) → [[Target|Alias]]
  result = result.replace(
    /\[([^\]]+)\]\(wiki:\/\/([^)#]+)(?:#([^)]*))?\)/g,
    (_match, alias: string, encodedTarget: string, encodedHeading?: string) => {
      const target = decodeURIComponent(encodedTarget);
      const heading = encodedHeading
        ? decodeURIComponent(encodedHeading)
        : undefined;
      const label = heading ? `${target} § ${heading}` : target;

      if (alias === label) {
        // No alias transformation needed
        return heading ? `[[${target}#${heading}]]` : `[[${target}]]`;
      }

      return heading
        ? `[[${target}#${heading}|${alias}]]`
        : `[[${target}|${alias}]]`;
    }
  );

  return result;
}

// ---------------------------------------------------------------------------
// TipTap editor helpers live in `src/editor/markdown.ts`.
