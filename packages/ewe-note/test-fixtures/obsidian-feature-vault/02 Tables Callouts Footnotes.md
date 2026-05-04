---
title: Tables Callouts and Footnotes
tags:
  - parity
  - markdown/tables
  - markdown/callouts
---

# Tables Callouts and Footnotes

## Table coverage

| Feature    | Example               | Status          |
| ---------- | --------------------- | --------------- | ------ |
| Wiki link  | [[Projects/Overview]] | linked          |
| Alias link | [[Areas/Overview      | Area overview]] | linked |
| Tag text   | #parity/table         | source          |
| Code       | `const ready = true`  | inline          |

| Left  | Center | Right |
| :---- | :----: | ----: |
| alpha |  beta  | gamma |
| one   |  two   | three |

## Callout coverage

> [!note] Default note callout
> This note callout links to [[04 Properties and Tags]].

> [!warning]- Folded warning
> Source preservation matters even if rich rendering is partial.

> [!example] Example with list
>
> - bullet one
> - bullet two

## Footnote coverage

Callouts and footnotes can coexist in one note.[^shared]

Named footnotes should stay stable across edits.[^named-footnote]

Inline footnote example.^[Inline footnote with **bold** text.]

[^shared]: Shared footnote text that mentions [[08 Search and Discovery]].

[^named-footnote]: Named footnotes should preserve their label text.
