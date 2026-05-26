export interface OutgoingWikiLink {
  target: string;
  display: string;
  alias?: string;
  heading?: string;
  blockRef?: string;
  noteId: string | null;
  raw: string;
}

export interface UnlinkedMention {
  noteId: string;
  mention: string;
  start: number;
  end: number;
}

export interface ExtractedWikiLink {
  target: string;
  alias?: string;
  heading?: string;
  blockRef?: string;
  raw: string;
}

function safeDecodeUriComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function normalizeWikiTarget(target: string): string {
  return target
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function normalizeSourcePath(sourcePath?: string) {
  const normalized = sourcePath
    ?.trim()
    .replace(/\\/g, '/')
    .replace(/^\.\/+/, '')
    .replace(/\/+/g, '/')
    .trim();
  return normalized || undefined;
}

function withoutMarkdownExtension(target: string) {
  return target.replace(/\.md$/i, '').trim();
}

function uniqueNonEmpty(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])
  );
}

export function getSourcePathTargets(sourcePath?: string): string[] {
  const normalized = normalizeSourcePath(sourcePath);
  if (!normalized) return [];

  const extensionless = withoutMarkdownExtension(normalized);
  const basename = normalized.split('/').filter(Boolean).at(-1) ?? normalized;
  const basenameExtensionless = withoutMarkdownExtension(basename);

  return uniqueNonEmpty([
    normalized,
    extensionless,
    basename,
    basenameExtensionless,
  ]);
}

export function getNormalizedWikiTargetKeys(target: string): string[] {
  return uniqueNonEmpty([target, ...getSourcePathTargets(target)]).map(
    (value) => normalizeWikiTarget(value)
  );
}

export function getNormalizedWikiTargetEntries(
  target: string
): Array<{ key: string; mention: string }> {
  return uniqueNonEmpty([target, ...getSourcePathTargets(target)]).map(
    (mention) => ({ key: normalizeWikiTarget(mention), mention })
  );
}

function parseWikiHrefTarget(href: string): ExtractedWikiLink | null {
  if (!href.startsWith('wiki://')) return null;

  const withoutScheme = href.slice('wiki://'.length);
  const [encodedTarget, encodedAnchor] = withoutScheme.split('#');
  if (!encodedTarget) return null;

  const decodedTarget = safeDecodeUriComponent(encodedTarget).trim();
  const decodedAnchor = encodedAnchor
    ? safeDecodeUriComponent(encodedAnchor).trim()
    : null;

  if (!decodedTarget) return null;

  if (decodedAnchor?.startsWith('^')) {
    return {
      target: decodedTarget,
      blockRef: decodedAnchor.slice(1),
      raw: `[[${decodedTarget}#${decodedAnchor}]]`,
    };
  }

  return {
    target: decodedTarget,
    heading: decodedAnchor ?? undefined,
    raw: decodedAnchor
      ? `[[${decodedTarget}#${decodedAnchor}]]`
      : `[[${decodedTarget}]]`,
  };
}

function parseWikiBraceLink(match: RegExpMatchArray): ExtractedWikiLink | null {
  const inner = (match[1] ?? '').trim();
  if (!inner) return null;

  const firstPipeIndex = inner.indexOf('|');
  const [targetAndRef, aliasValue] =
    firstPipeIndex === -1
      ? [inner, undefined]
      : [inner.slice(0, firstPipeIndex), inner.slice(firstPipeIndex + 1)];
  const alias = aliasValue?.trim();
  const targetPart = targetAndRef?.trim() ?? '';
  if (!targetPart) return null;

  const hashIndex = targetPart.indexOf('#');
  if (hashIndex === -1) {
    return {
      target: targetPart,
      alias,
      raw: match[0] ?? '',
    };
  }

  const target = targetPart.slice(0, hashIndex).trim();
  const rawHeading = targetPart.slice(hashIndex + 1).trim();
  if (!target) return null;

  if (rawHeading.startsWith('^')) {
    return {
      target,
      alias,
      blockRef: rawHeading.slice(1),
      raw: match[0] ?? '',
    };
  }

  return {
    target,
    alias,
    heading: rawHeading,
    raw: match[0] ?? '',
  };
}

function buildDisplay(target: string, alias?: string, heading?: string) {
  if (alias) {
    if (!heading) return alias;
    return `${alias} § ${heading}`;
  }

  return heading ? `${target} § ${heading}` : target;
}

function parseMarkdownWikiLink(
  label: string,
  href: string
): ExtractedWikiLink | null {
  const parsed = parseWikiHrefTarget(href);
  if (!parsed) return null;

  return {
    target: parsed.target,
    alias: label,
    heading: parsed.heading,
    blockRef: parsed.blockRef,
    raw: matchWikiMarkdownLink(label, href),
  };
}

function matchWikiMarkdownLink(label: string, href: string) {
  return `[${label}](${href})`;
}

function normalizeForDedupe(raw: ExtractedWikiLink) {
  return `${normalizeWikiTarget(raw.target)}|${normalizeWikiTarget(raw.alias ?? '')}|${raw.heading ? normalizeWikiTarget(raw.heading) : ''}|${raw.blockRef ? normalizeWikiTarget(raw.blockRef) : ''}`;
}

export function extractWikiLinkTargets(markdown: string): OutgoingWikiLink[] {
  const links: OutgoingWikiLink[] = [];
  const seen = new Set<string>();

  for (const match of markdown.matchAll(/\[\[([^\]]+)\]\]/g)) {
    if (match.index !== undefined && markdown[match.index - 1] === '!') {
      continue;
    }

    const parsed = parseWikiBraceLink(match);
    if (!parsed) continue;

    const signature = normalizeForDedupe(parsed);
    if (!seen.has(signature)) {
      links.push({
        target: parsed.target,
        display: buildDisplay(parsed.target, parsed.alias, parsed.heading),
        alias: parsed.alias,
        heading: parsed.heading,
        blockRef: parsed.blockRef,
        noteId: null,
        raw: parsed.raw,
      });
      seen.add(signature);
    }
  }

  for (const match of markdown.matchAll(
    /\[((?:[^\]\\]|\\.)+)\]\((wiki:\/\/[^)]+)\)/g
  )) {
    const markdownText = match[1]?.trim();
    const href = match[2] ?? '';
    if (!markdownText) continue;

    const parsed = parseMarkdownWikiLink(markdownText, href);
    if (!parsed) continue;

    const signature = normalizeForDedupe(parsed);
    if (seen.has(signature)) continue;

    links.push({
      target: parsed.target,
      display: buildDisplay(parsed.target, parsed.alias, parsed.heading),
      alias: parsed.alias,
      heading: parsed.heading,
      blockRef: parsed.blockRef,
      noteId: null,
      raw: parsed.raw,
    });
    seen.add(signature);
  }

  return links;
}

export function extractWikiTargetsForText(markdown: string): string[] {
  return extractWikiLinkTargets(markdown).map((link) => link.target);
}

function stripCodeBlocks(markdown: string) {
  return markdown.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`\n]*`/g, ' ');
}

export function stripWikiMarkup(markdown: string) {
  return markdown
    .replace(/\[\[[^\]]+\]\]/g, ' ')
    .replace(/\[[^\]]+\]\([^)]+\)/g, ' ');
}

export function contentForMentionScan(markdown: string) {
  return stripCodeBlocks(markdown);
}

export function containsPhrase(source: string, phrase: string) {
  if (!phrase) return false;
  const normalizedSource = normalizeWikiTarget(source);
  const normalizedPhrase = normalizeWikiTarget(phrase);
  return normalizedSource.includes(normalizedPhrase);
}

type TextRange = {
  start: number;
  end: number;
};

function collectExcludedRanges(markdown: string) {
  const ranges: TextRange[] = [];
  const collect = (pattern: RegExp) => {
    for (const match of markdown.matchAll(pattern)) {
      if (match.index === undefined) continue;
      ranges.push({ start: match.index, end: match.index + match[0].length });
    }
  };

  collect(/```[\s\S]*?```/g);
  collect(/`[^`\n]*`/g);
  collect(/!?\[\[[^\]]+\]\]/g);
  collect(/!?\[((?:[^\]\\]|\\.)+)\]\([^)]+\)/g);

  return ranges.sort((a, b) => a.start - b.start);
}

function isInsideRange(index: number, ranges: TextRange[]) {
  return ranges.some((range) => index >= range.start && index < range.end);
}

export function findEligibleMentionRange(
  markdown: string,
  mention: string
): TextRange | null {
  const trimmed = mention.trim();
  if (!trimmed) return null;

  const ranges = collectExcludedRanges(markdown);
  const matcher = new RegExp(
    trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    'gi'
  );

  for (const match of markdown.matchAll(matcher)) {
    if (match.index === undefined) continue;
    if (isInsideRange(match.index, ranges)) continue;

    return {
      start: match.index,
      end: match.index + match[0].length,
    };
  }

  return null;
}

export function linkUnlinkedMentionInMarkdown(
  markdown: string,
  targetTitle: string,
  mention: string
) {
  const range = findEligibleMentionRange(markdown, mention);
  if (!range) return markdown;

  const matchedText = markdown.slice(range.start, range.end);
  const insertionText =
    matchedText.toLowerCase() === targetTitle.toLowerCase()
      ? `[[${targetTitle}]]`
      : `[[${targetTitle}|${matchedText}]]`;

  return [
    markdown.slice(0, range.start),
    insertionText,
    markdown.slice(range.end),
  ].join('');
}

export function extractUnlinkedMentions(
  markdown: string,
  candidates:
    | Map<string, ExtractedWikiLinkTargetValue>
    | Record<string, ExtractedWikiLinkTargetValue>
    | null
    | undefined,
  excludedTargets: Set<string>
) {
  const scanned = normalizeWikiTarget(
    stripWikiMarkup(contentForMentionScan(markdown))
  );
  const mentions: UnlinkedMention[] = [];
  const mentionKeys = new Set<string>();

  if (!candidates) return mentions;
  const candidateEntries =
    candidates instanceof Map
      ? candidates.entries()
      : Object.entries(candidates);

  for (const [target, value] of candidateEntries) {
    const noteId = typeof value === 'string' ? value : value.noteId;
    const mentionText = typeof value === 'string' ? target : value.mention;

    if (excludedTargets.has(target)) continue;
    if (!containsPhrase(scanned, target)) continue;
    const range = findEligibleMentionRange(markdown, mentionText);
    if (!range) continue;

    if (!mentionKeys.has(noteId)) {
      mentionKeys.add(noteId);
      mentions.push({ noteId, mention: mentionText, ...range });
    }
  }

  return mentions;
}
type ExtractedWikiLinkTargetValue =
  | string
  | { noteId: string; mention: string };
