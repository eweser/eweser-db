---
title: Code Blocks Test
---

# Code Blocks Test Note

<!-- Tests: fenced code blocks with language, nested code blocks, inline code, various languages -->

## Inline Code

Simple: `const x = 42`

Path: `/home/user/vault/note.md`

Command: `npm run dev`

Code with backtick inside: `` const template = `Hello, ${name}!` ``

## Fenced Code Blocks

TypeScript:

```typescript
interface Note {
  id: string;
  text: string;
  sourcePath?: string;
  frontmatter?: Record<string, unknown>;
}

function parseNote(markdown: string): Note {
  const { frontmatter, content } = parseFrontmatter(markdown);
  return {
    id: generateId(),
    text: content,
    frontmatter,
  };
}
```

JavaScript:

```javascript
const greet = (name) => `Hello, ${name}!`;
console.log(greet('World'));
```

Python:

```python
def parse_frontmatter(markdown: str) -> dict:
    """Parse YAML frontmatter from markdown string."""
    if not markdown.startswith('---'):
        return {}
    end = markdown.index('---', 3)
    yaml_text = markdown[3:end]
    return yaml.safe_load(yaml_text)
```

Bash:

```bash
#!/bin/bash
# Import vault script
VAULT_PATH="$1"
AUTH_URL="${2:-http://localhost:3001}"

if [ -z "$VAULT_PATH" ]; then
  echo "Usage: import-vault.sh <vault-path> [auth-url]"
  exit 1
fi

npx tsx packages/ewe-note/src/cli/import-vault.ts \
  --vault "$VAULT_PATH" \
  --auth-url "$AUTH_URL"
```

JSON:

```json
{
  "name": "my-vault",
  "version": "1.0.0",
  "obsidian": {
    "legacyEditor": false,
    "livePreview": true
  }
}
```

YAML:

```yaml
title: Example Note
aliases:
  - Example
tags:
  - test
date: 2026-04-04
```

Markdown (showing OFM syntax as literal text):

```markdown
[[Wiki Link]]
![[Embedded Note]]
==Highlighted text==
%%Comment%%

> [!note] Callout title
> Content
```

Plain text (no language):

```
This is plain text in a code block.
[[These brackets are NOT wiki links]]
```

## Code Block Without Language Hint

```
SELECT * FROM notes
WHERE tags @> ARRAY['test']
ORDER BY created_at DESC;
```

## Code Blocks With Special Characters

```typescript
const regex = /\[\[([^\]]+)\]\]/g; // matches [[wiki links]]
const wikiLinkPattern = /!?\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/;
```
