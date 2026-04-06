/**
 * Highlight mark extension for Obsidian Flavored Markdown.
 *
 * Obsidian syntax: ==highlighted text==
 *
 * Since BlockNote v0.23 doesn't support custom inline marks natively,
 * highlights are transformed at the serialization layer:
 *   - On load: ==text== → **text** (bold, as visual approximation)
 *   - On save: (no reverse — bold text stays bold; original OFM preserved in note.text)
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
