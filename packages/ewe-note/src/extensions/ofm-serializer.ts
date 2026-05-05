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

import type { VaultConfig } from '../utils/attachment-resolver';

// ---------------------------------------------------------------------------
// Pre-processing: OFM -> Standard Markdown (for import into the editor)
// ---------------------------------------------------------------------------

/**
 * Transform OFM-specific syntax into editor-compatible markdown
 * before passing to tryParseMarkdownToBlocks().
 *
 * @param ofm - Obsidian Flavored Markdown source
 * @param vaultConfig - Optional vault config for resolving attachment URLs
 * @param noteSourcePath - Optional note source path for relative attachment resolution
 */
export function ofmToMarkdown(
  ofm: string,
  vaultConfig?: VaultConfig,
  noteSourcePath?: string
): string {
  let result = ofm;

  // Preserve block comments %%...%% as plain text for source fidelity.

  // Preserve all embeds as source-visible OFM until a real TipTap node owns
  // media/embed serialization. This avoids image/media data loss on editor save.
  result = result.replace(/!\[\[([^\]]+)\]\]/g, (_match, raw: string) => {
    void vaultConfig;
    void noteSourcePath;
    return `![[${String(raw).trim()}]]`;
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
