/**
 * Highlight mark extension for Obsidian Flavored Markdown.
 *
 * Obsidian syntax: ==highlighted text==
 *
 * Highlights are transformed at the serialization layer:
 *   - On load: ==text== -> a TipTap highlight mark
 *   - On save: highlight marks serialize back to ==text==
 *
 * For full highlight rendering, this module exports a CSS class and a
 * regex that can be used with a post-render DOM pass.
 */

/** Regex to match ==highlighted text== in markdown source */
export const HIGHLIGHT_PATTERN = /==([^=\n]+)==/g;

/** CSS class to apply to highlighted spans */
export const HIGHLIGHT_CSS_CLASS = 'ofm-highlight';

/**
 * Apply highlight wrapping to a text node's innerHTML.
 * Replaces ==text== with <mark class="ofm-highlight">text</mark>.
 */
export function applyHighlightStyling(html: string): string {
  return html.replace(
    HIGHLIGHT_PATTERN,
    `<mark class="${HIGHLIGHT_CSS_CLASS}">$1</mark>`
  );
}
