---
title: Properties and Tags Test
aliases:
  - Props Test
  - Frontmatter Test
tags:
  - test
  - frontmatter
  - properties
date: 2026-04-04
datetime: 2026-04-04T10:30:00
number_field: 42
boolean_field: true
list_field:
  - alpha
  - beta
  - gamma
nested_tags:
  - test/nested
  - test/nested/deep
url_field: https://example.com
empty_field:
---

# Properties and Tags Test Note

<!-- Tests: YAML frontmatter with all property types, inline #tags, #nested/tags -->

## Inline Tags

Simple tag: #test

Nested tag: #test/nested

Deep nested: #test/nested/deep

Multi-word tag (uses slash): #project/my-project/active

Tag at end of sentence: This note is about #frontmatter and #properties.

## Tags in Various Positions

#tag-at-start of line

Text with #inline-tag surrounded by words.

- List item with #list-tag
- Another item

> Blockquote with #blockquote-tag

## Tags That Should NOT Parse

Tags inside code blocks should be ignored:

```
#this-should-not-be-a-tag
```

Inline code: `#also-not-a-tag`

## Property Types Reference

The frontmatter above demonstrates:

- `title` — text property
- `aliases` — list property (for wiki-link resolution)
- `tags` — tags list property
- `date` — date property (YYYY-MM-DD)
- `datetime` — date+time property (ISO 8601)
- `number_field` — number property
- `boolean_field` — checkbox/boolean property
- `list_field` — generic list
- `nested_tags` — tags with hierarchy
- `url_field` — URL/text property
- `empty_field` — null/empty property
