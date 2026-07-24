/**
 * Obsidian Flavored Markdown (OFM) parser utilities.
 * Handles frontmatter, tags, and wiki-link extraction.
 */

// ---------------------------------------------------------------------------
// Frontmatter
// ---------------------------------------------------------------------------

export interface ParsedFrontmatter {
  frontmatter: Record<string, unknown>;
  content: string;
}

/**
 * Split YAML frontmatter from the markdown body.
 * Returns empty frontmatter object if no frontmatter is present.
 */
export function parseFrontmatter(markdown: string): ParsedFrontmatter {
  if (!markdown.startsWith('---')) {
    return { frontmatter: {}, content: markdown };
  }

  // Find the closing ---
  const rest = markdown.slice(3);
  const endIndex = rest.search(/\n---\s*(\n|$)/);

  if (endIndex === -1) {
    // No closing delimiter — treat whole text as content
    return { frontmatter: {}, content: markdown };
  }

  const yamlText = rest.slice(0, endIndex).replace(/^\n/, '');
  const content = rest.slice(endIndex).replace(/^\n---\s*\n?/, '');

  const frontmatter = parseSimpleYaml(yamlText);
  return { frontmatter, content };
}

/**
 * Reassemble frontmatter + content back into a markdown string with YAML header.
 */
export function serializeFrontmatter(
  frontmatter: Record<string, unknown>,
  content: string
): string {
  if (Object.keys(frontmatter).length === 0) {
    return content;
  }
  const yamlLines = serializeYamlLines(frontmatter);
  return `---\n${yamlLines}\n---\n${content}`;
}

// ---------------------------------------------------------------------------
// Tag extraction
// ---------------------------------------------------------------------------

/**
 * Extract all #tag and #tag/subtag patterns from markdown.
 * Ignores tags inside code blocks (fenced ``` or inline `code`).
 */
export function extractTags(markdown: string): string[] {
  const withoutCodeBlocks = stripCodeBlocks(markdown);
  const withoutFrontmatter = parseFrontmatter(markdown).content;
  // Use stripped content for tag extraction
  const source = stripCodeBlocks(withoutFrontmatter);

  const tags = new Set<string>();
  // Match #word or #word/subword — must not be preceded by [ or ( (not part of links)
  const tagPattern = /(?<![[\w])#([a-zA-Z][a-zA-Z0-9_/-]*)/g;
  let match: RegExpExecArray | null;

  // Suppress unused variable warning — withoutCodeBlocks used as guard
  void withoutCodeBlocks;

  while ((match = tagPattern.exec(source)) !== null) {
    if (match[1]) tags.add(match[1]);
  }

  return Array.from(tags);
}

// ---------------------------------------------------------------------------
// Wiki-link extraction
// ---------------------------------------------------------------------------

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
export function extractWikiLinks(markdown: string): WikiLink[] {
  const { content } = parseFrontmatter(markdown);
  const source = stripCodeBlocks(content);

  const links: WikiLink[] = [];
  // Matches both [[link]] and ![[embed]]
  const wikiLinkPattern = /(!?)\[\[([^\]]+)\]\]/g;
  let match: RegExpExecArray | null;

  while ((match = wikiLinkPattern.exec(source)) !== null) {
    const isEmbed = match[1] === '!';
    const inner = match[2] ?? '';
    const raw = match[0] ?? '';

    // Split by | to get alias
    const pipeParts = inner.split('|');
    const mainPart = pipeParts[0] ?? '';
    const alias = pipeParts[1];

    // Split by # to get heading or block ref
    const hashParts = mainPart.split('#');
    const target = (hashParts[0] ?? '').trim();
    const fragment = hashParts[1]?.trim();

    let heading: string | undefined;
    let blockRef: string | undefined;

    if (fragment) {
      if (fragment.startsWith('^')) {
        blockRef = fragment.slice(1);
      } else {
        heading = fragment;
      }
    }

    const link: WikiLink = { target, isEmbed, raw };
    if (alias !== undefined) link.alias = alias.trim();
    if (heading !== undefined) link.heading = heading;
    if (blockRef !== undefined) link.blockRef = blockRef;
    links.push(link);
  }

  return links;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Remove fenced code blocks and inline code from text, replacing with
 * empty strings so positions roughly align and tag/link patterns don't match inside them.
 */
function stripCodeBlocks(text: string): string {
  // Remove fenced code blocks (``` or ~~~)
  let result = text.replace(/```[\s\S]*?```/g, (m) => ' '.repeat(m.length));
  result = result.replace(/~~~[\s\S]*?~~~/g, (m) => ' '.repeat(m.length));
  // Remove inline code
  result = result.replace(/`[^`\n]+`/g, (m) => ' '.repeat(m.length));
  return result;
}

/**
 * Very minimal YAML parser — handles the subset used in Obsidian frontmatter.
 * Supports: strings, numbers, booleans, null, plain lists, nested (object) values.
 * For complex YAML, real consumers should use the `js-yaml` library.
 */
function parseSimpleYaml(yaml: string): Record<string, unknown> {
  const lines = yaml.split('\n');
  const result = parseYamlBlock(lines, 0, 0);
  return isRecord(result.value) ? result.value : {};
}

/**
 * Parse a YAML block starting at `startIndex` with base indent `baseIndent`.
 * Returns the parsed value and the index after the last consumed line.
 */
function parseYamlBlock(
  lines: string[],
  startIndex: number,
  baseIndent: number
): { value: unknown; nextIndex: number } {
  const first = nextYamlContentLine(lines, startIndex);
  if (!first || first.indent < baseIndent) {
    return { value: {}, nextIndex: first?.index ?? lines.length };
  }
  if (first.indent === baseIndent && isYamlListItem(first.trimmed)) {
    return parseYamlSequence(lines, first.index, baseIndent);
  }

  return parseYamlMapping(lines, first.index, baseIndent);
}

function parseYamlMapping(
  lines: string[],
  startIndex: number,
  baseIndent: number
): { value: Record<string, unknown>; nextIndex: number } {
  const result: Record<string, unknown> = {};
  let i = startIndex;

  while (i < lines.length) {
    const line = lines[i] ?? '';
    const trimmed = line.trimStart();

    if (trimmed === '' || trimmed.startsWith('#')) {
      i++;
      continue;
    }

    const indent = line.length - trimmed.length;
    if (indent < baseIndent) {
      // We've gone back up a level
      break;
    }
    if (indent > baseIndent) {
      // Unsupported continuation such as a multi-line scalar.
      i++;
      continue;
    }

    const keyMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_ -]*):\s*(.*)/);
    if (!keyMatch) {
      i++;
      continue;
    }

    const key = (keyMatch[1] as string).trim();
    const valueStr = (keyMatch[2] as string).trim();

    i++;

    if (valueStr === '') {
      const next = nextYamlContentLine(lines, i);
      if (next && next.indent > baseIndent) {
        const nested = parseYamlBlock(lines, next.index, next.indent);
        result[key] = nested.value;
        i = nested.nextIndex;
        continue;
      }
      result[key] = null;
      continue;
    }

    result[key] = parseYamlInlineValue(valueStr);
  }

  return { value: result, nextIndex: i };
}

function parseYamlSequence(
  lines: string[],
  startIndex: number,
  baseIndent: number
): { value: unknown[]; nextIndex: number } {
  const result: unknown[] = [];
  let i = startIndex;

  while (i < lines.length) {
    const current = nextYamlContentLine(lines, i);
    if (!current) {
      return { value: result, nextIndex: lines.length };
    }
    if (current.indent < baseIndent) break;
    if (current.indent !== baseIndent || !isYamlListItem(current.trimmed)) {
      break;
    }

    const itemValue = current.trimmed.match(/^-(?:\s+(.*))?$/)?.[1] ?? '';
    i = current.index + 1;
    if (itemValue !== '') {
      result.push(parseYamlInlineValue(itemValue));
      continue;
    }

    const next = nextYamlContentLine(lines, i);
    if (next && next.indent > baseIndent) {
      const nested = parseYamlBlock(lines, next.index, next.indent);
      result.push(nested.value);
      i = nested.nextIndex;
      continue;
    }
    result.push(null);
  }

  return { value: result, nextIndex: i };
}

function nextYamlContentLine(
  lines: string[],
  startIndex: number
): { index: number; indent: number; trimmed: string } | null {
  for (let index = startIndex; index < lines.length; index++) {
    const line = lines[index] ?? '';
    const trimmed = line.trimStart();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    return {
      index,
      indent: line.length - trimmed.length,
      trimmed,
    };
  }
  return null;
}

function isYamlListItem(trimmed: string): boolean {
  return /^-(?:\s+.*)?$/.test(trimmed);
}

function parseYamlInlineValue(value: string): unknown {
  if (value === '[]') return [];
  if (value === '{}') return {};
  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1).trim();
    if (inner === '') return [];
    return inner.split(',').map((entry) => parseScalar(entry.trim()));
  }
  return parseScalar(value);
}

function parseScalar(value: string): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null' || value === '~' || value === '') return null;
  const num = Number(value);
  if (!isNaN(num) && value !== '') return num;
  // Strip surrounding quotes
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function serializeYamlLines(
  obj: Record<string, unknown>,
  currentIndent = 0
): string {
  return serializeYamlObject(obj, currentIndent).join('\n');
}

function serializeYamlObject(
  obj: Record<string, unknown>,
  currentIndent: number
): string[] {
  const indent = '  '.repeat(currentIndent);
  const lines: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      lines.push(`${indent}${key}:`);
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${indent}${key}: []`);
      } else {
        lines.push(`${indent}${key}:`);
        lines.push(...serializeYamlArray(value, currentIndent + 1));
      }
    } else if (isRecord(value)) {
      if (Object.keys(value).length === 0) {
        lines.push(`${indent}${key}: {}`);
      } else {
        lines.push(`${indent}${key}:`);
        lines.push(...serializeYamlObject(value, currentIndent + 1));
      }
    } else {
      lines.push(`${indent}${key}: ${serializeScalar(value)}`);
    }
  }
  return lines;
}

function serializeYamlArray(
  values: unknown[],
  currentIndent: number
): string[] {
  const indent = '  '.repeat(currentIndent);
  const lines: string[] = [];
  for (const value of values) {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${indent}- []`);
      } else {
        lines.push(`${indent}-`);
        lines.push(...serializeYamlArray(value, currentIndent + 1));
      }
    } else if (isRecord(value)) {
      if (Object.keys(value).length === 0) {
        lines.push(`${indent}- {}`);
      } else {
        lines.push(`${indent}-`);
        lines.push(...serializeYamlObject(value, currentIndent + 1));
      }
    } else {
      lines.push(`${indent}- ${serializeScalar(value)}`);
    }
  }
  return lines;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  );
}

function serializeScalar(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return String(value);
  const str = String(value);
  // Quote strings that could be misinterpreted
  if (str.includes(':') || str.includes('#') || str.includes('"')) {
    return `"${str.replace(/"/g, '\\"')}"`;
  }
  return str;
}
