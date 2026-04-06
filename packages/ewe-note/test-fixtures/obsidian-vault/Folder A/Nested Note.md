---
title: Nested Note in Folder A
aliases:
  - Nested Note
tags:
  - test
  - folder-a
---

# Nested Note in Folder A

<!-- Tests: folder hierarchy preservation (note lives at Folder A/Nested Note.md) -->

This note lives at `Folder A/Nested Note.md`, demonstrating that folder paths are preserved when importing to EweserDB.

## Links Back to Root

- See [[Basic Formatting]] for formatting syntax
- See [[Wiki Links]] for link examples
- See [[Callouts]] for callout blocks

## Links to Other Nested Notes

- [[Folder A/Subfolder/Deep Note]] — an even more deeply nested note

## Content

This note has standard content to verify that:

1. The folder path `Folder A/` is stored in `note.sourcePath`
2. Wiki links resolve correctly across folder levels
3. The note imports with correct metadata

### A Heading for Testing

This heading can be linked to with `[[Folder A/Nested Note#A Heading for Testing]]`.
