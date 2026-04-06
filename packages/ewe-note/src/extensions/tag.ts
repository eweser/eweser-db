/**
 * Tag inline extension for Obsidian Flavored Markdown.
 *
 * Obsidian tag syntax: #tag and #nested/tag
 *
 * At the serialization layer, tags are preserved as-is in the markdown.
 * This module provides utilities for tag parsing and filtering used by
 * the sidebar and note index.
 */

/** Regex to match a valid Obsidian tag (must start with letter, can contain / for nesting) */
export const TAG_PATTERN = /(?<![[\w])#([a-zA-Z][a-zA-Z0-9_/-]*)/g;

/**
 * Normalize a tag for comparison (lowercase, trimmed).
 */
export function normalizeTag(tag: string): string {
  return tag.replace(/^#/, '').toLowerCase().trim();
}

/**
 * Check if two tags match, supporting prefix matching for nested tags.
 * e.g. filterByTag("project", "#project/active") → true
 */
export function tagMatchesFilter(filterTag: string, noteTag: string): boolean {
  const filter = normalizeTag(filterTag);
  const note = normalizeTag(noteTag);
  return note === filter || note.startsWith(`${filter}/`);
}

/**
 * Get parent tag hierarchy for a nested tag.
 * e.g. "project/active/sprint1" → ["project", "project/active", "project/active/sprint1"]
 */
export function getTagHierarchy(tag: string): string[] {
  const normalized = normalizeTag(tag);
  const parts = normalized.split('/');
  const result: string[] = [];
  for (let i = 1; i <= parts.length; i++) {
    result.push(parts.slice(0, i).join('/'));
  }
  return result;
}

/**
 * Build a unique sorted list of all tags from a set of notes,
 * including all parent tags from nested hierarchies.
 */
export function buildTagList(allTags: string[][]): string[] {
  const tagSet = new Set<string>();
  for (const noteTags of allTags) {
    for (const tag of noteTags) {
      for (const parent of getTagHierarchy(tag)) {
        tagSet.add(parent);
      }
    }
  }
  return Array.from(tagSet).sort();
}
