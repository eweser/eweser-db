---
title: Source Mode Edge Cases
tags:
  - parity
  - source-mode
---

# Source Mode Edge Cases

This note intentionally includes syntax that should remain truthful in source
mode even if the rich editor does not render it specially.

## Raw HTML

<details open>
  <summary>Expandable HTML block</summary>
  <p>HTML should not be silently dropped.</p>
</details>

## Comment and escaped link cases

%%Comment bodies should survive.%%

Escaped wiki link literal: \[\[Projects/Overview\]\]

Escaped callout literal:

\> [!note] This should stay plain text here.

## Literal JSON metadata block

```json
{
  "note": "This is not frontmatter. It is source-mode content.",
  "preserve": true
}
```
