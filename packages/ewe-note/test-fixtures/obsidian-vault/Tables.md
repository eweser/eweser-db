---
title: Tables Test
---

# Tables Test Note

<!-- Tests: basic tables, aligned columns, tables with internal links/embeds/formatting -->

## Basic Table

| Column 1 | Column 2 | Column 3 |
| -------- | -------- | -------- |
| Cell A1  | Cell A2  | Cell A3  |
| Cell B1  | Cell B2  | Cell B3  |
| Cell C1  | Cell C2  | Cell C3  |

## Aligned Columns

| Left Aligned | Center Aligned | Right Aligned |
| :----------- | :------------: | ------------: |
| left         |     center     |         right |
| text         |      text      |          text |
| more         |      more      |          more |

## Table with Formatting

| Feature    | Syntax       | Status     |
| ---------- | ------------ | ---------- |
| **Bold**   | `**text**`   | ✅ Working |
| _Italic_   | `*text*`     | ✅ Working |
| `Code`     | `` `code` `` | ✅ Working |
| ~~Strike~~ | `~~text~~`   | ✅ Working |

## Table with Wiki Links

| Note Name        | Type      | Link                                          |
| ---------------- | --------- | --------------------------------------------- |
| Basic Formatting | Tutorial  | [[Basic Formatting]]                          |
| Wiki Links Guide | Reference | [[Wiki Links\|Wiki Links Guide]]              |
| Callouts         | Reference | [[Callouts#Basic Note Callout\|Note Callout]] |

## Table with Tags

| Category   | Tags                     |
| ---------- | ------------------------ |
| Testing    | #test #test/nested       |
| Properties | #frontmatter #properties |

## Wide Table

| ID  | Name       | Description                               | Status  | Priority | Assignee | Due Date   | Notes                    |
| --- | ---------- | ----------------------------------------- | ------- | -------- | -------- | ---------- | ------------------------ |
| 1   | Task One   | This is a longer description for task one | Active  | High     | Alice    | 2026-04-10 | See [[Basic Formatting]] |
| 2   | Task Two   | Another description                       | Done    | Low      | Bob      | 2026-04-15 | Done                     |
| 3   | Task Three | Third task description                    | Pending | Medium   | Charlie  | 2026-04-20 |                          |
