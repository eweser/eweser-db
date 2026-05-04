---
title: Markdown Syntax Coverage
aliases:
  - Syntax Coverage
tags:
  - parity
  - markdown
---

# Markdown Syntax Coverage

This note is intentionally dense. It covers render-edit cases plus several
source-preserve patterns that should remain visible in source mode.

## Heading two

### Heading three

#### Heading four

##### Heading five

###### Heading six

Paragraph text with **bold**, _italic_, **_bold italic_**, ~~strikethrough~~,
==highlight==, `inline code`, and an [external link](https://example.com/docs).

<aside data-raw-html="true">Raw HTML should survive round trip even if it is not
rendered as a special block.</aside>

Escaped syntax should stay literal: \*not italic\*, \[\[not a wiki link\]\], and
\`not inline code\`.

%% Inline comment that should survive source preservation. %%

%%
Block comment
spanning multiple lines
%%

## Lists and tasks

- Unordered item
- Nested item parent
  - Child item
  - Child item with ==highlight==

1. Ordered item
2. Ordered item with [[Projects/Overview]]

- [ ] Follow up on [[05 Link Targets]]
- [x] Confirm [[07 Embeds and Media]] references

## Blockquotes

> Quote level one.
>
> > Quote level two with `code`.

## Inline source-only patterns

Text before %%comment%% text after.

Literal embed syntax for source-mode review:

`![[Attachments/reference-sheet.pdf]]`

Literal block reference syntax:

`[[05 Link Targets#^addressable-block]]`
