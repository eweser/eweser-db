/**
 * Obsidian Flavored Markdown (OFM) parser utilities.
 * Handles frontmatter, tags, and wiki-link extraction.
 */
export interface ParsedFrontmatter {
    frontmatter: Record<string, unknown>;
    content: string;
}
/**
 * Split YAML frontmatter from the markdown body.
 * Returns empty frontmatter object if no frontmatter is present.
 */
export declare function parseFrontmatter(markdown: string): ParsedFrontmatter;
/**
 * Reassemble frontmatter + content back into a markdown string with YAML header.
 */
export declare function serializeFrontmatter(frontmatter: Record<string, unknown>, content: string): string;
/**
 * Extract all #tag and #tag/subtag patterns from markdown.
 * Ignores tags inside code blocks (fenced ``` or inline `code`).
 */
export declare function extractTags(markdown: string): string[];
export interface WikiLink {
    /** The note target, e.g. "My Note" or "Folder/Note" */
    target: string;
    /** Display alias, e.g. [[target|alias]] → "alias" */
    alias?: string;
    /** Heading reference, e.g. [[Note#Heading]] → "Heading" */
    heading?: string;
    /** Block reference, e.g. [[Note#^block-id]] → "block-id" */
    blockRef?: string;
    /** True when prefixed with !, e.g. ![[image.png]] */
    isEmbed: boolean;
    /** The full raw match string */
    raw: string;
}
/**
 * Extract all wiki-links and embeds from markdown.
 * Ignores links inside code blocks (fenced ``` or inline `code`).
 */
export declare function extractWikiLinks(markdown: string): WikiLink[];
