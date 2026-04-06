/**
 * OFM (Obsidian Flavored Markdown) Serializer / Deserializer
 *
 * Converts between BlockNote's internal block format and Obsidian Flavored Markdown.
 * Handles OFM-specific syntax that BlockNote's built-in markdown converter doesn't support:
 *   - Wiki links: [[Note Name]] and [[Note Name|Alias]]
 *   - Highlights: ==text==
 *   - Comments: %%text%%
 *   - Callouts: > [!type] Title
 *   - Image embeds: ![[image.png|300]]
 *   - Tags: #tag (preserved as-is)
 */

import type { Block, BlockNoteEditor } from '@blocknote/core';
import type { VaultConfig } from '@/utils/attachment-resolver';
import { resolveAttachment } from '@/utils/attachment-resolver';

// ---------------------------------------------------------------------------
// Pre-processing: OFM → Standard Markdown (for import into BlockNote)
// ---------------------------------------------------------------------------

/**
 * Transform OFM-specific syntax into BlockNote-compatible markdown
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

  // Strip block comments %%...%% (multiline)
  result = result.replace(/%%[\s\S]*?%%/g, '');

  // Image embeds: ![[image.png|300]] → ![image.png](resolved-url)
  result = result.replace(
    /!\[\[([^\]|#]+?)(?:\|([^\]]*))?\]\]/g,
    (_match, target: string, _size: string) => {
      const name = target.trim();
      const url = vaultConfig
        ? resolveAttachment(name, vaultConfig, noteSourcePath)
        : `vault://${encodeURIComponent(name)}`;
      return `![${name}](${url})`;
    }
  );

  // Note embeds: ![[Note Name]] (no extension) → blockquote placeholder
  result = result.replace(
    /!\[\[([^\]]+)\]\]/g,
    (_match, target: string) => `> 📄 *Embedded note: [[${target.trim()}]]*`
  );

  // Wiki links with alias: [[Note Name|Alias]] → [Alias](wiki://Note Name)
  result = result.replace(
    /\[\[([^\]|#]+?)(?:#([^\]|]*))?\|([^\]]+)\]\]/g,
    (_match, target: string, heading: string | undefined, alias: string) => {
      const href = heading
        ? `wiki://${encodeURIComponent(target.trim())}#${encodeURIComponent(heading.trim())}`
        : `wiki://${encodeURIComponent(target.trim())}`;
      return `[${alias.trim()}](${href})`;
    }
  );

  // Wiki links without alias: [[Note Name#Heading]] → [Note Name § Heading](wiki://Note Name#Heading)
  result = result.replace(
    /\[\[([^\]|#]*?)(?:#([^\]|]*))?\]\]/g,
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

  // Highlights: ==text== → **text** (BlockNote doesn't have a highlight mark natively)
  result = result.replace(/==([^=]+)==/g, '**$1**');

  return result;
}

// ---------------------------------------------------------------------------
// Post-processing: Standard Markdown → OFM (for export from BlockNote)
// ---------------------------------------------------------------------------

/**
 * Transform BlockNote-serialized markdown back to OFM syntax.
 *
 * Reverses ofmToMarkdown() transformations:
 *   [Note Name](wiki://Note Name)         → [[Note Name]]
 *   [Alias](wiki://Note Name)             → [[Note Name|Alias]]
 *   ![name](vault://name)                 → ![[name]]
 */
export function markdownToOfm(markdown: string): string {
  let result = markdown;

  // Image vault links: ![name](vault://path) → ![[path]]
  result = result.replace(
    /!\[([^\]]*)\]\(vault:\/\/([^)]+)\)/g,
    (_match, _alt: string, encoded: string) => {
      const path = decodeURIComponent(encoded);
      return `![[${path}]]`;
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
// Editor helpers
// ---------------------------------------------------------------------------

/**
 * Serialize editor blocks to OFM-compatible markdown.
 * Replaces the lossy blocksToMarkdownLossy() call for vault-synced notes.
 */
export async function blocksToOfm(
  editor: BlockNoteEditor,
  blocks?: Block[]
): Promise<string> {
  const markdown = await editor.blocksToMarkdownLossy(blocks);
  return markdownToOfm(markdown);
}

/**
 * Parse OFM markdown into BlockNote blocks.
 * Use instead of tryParseMarkdownToBlocks() for vault-synced notes.
 */
export async function ofmToBlocks(
  editor: BlockNoteEditor,
  ofm: string,
  vaultConfig?: VaultConfig,
  noteSourcePath?: string
): Promise<Block[]> {
  const markdown = ofmToMarkdown(ofm, vaultConfig, noteSourcePath);
  return editor.tryParseMarkdownToBlocks(markdown);
}
