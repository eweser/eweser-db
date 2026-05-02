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

    if (!mentionKeys.has(noteId)) {
      mentionKeys.add(noteId);
      mentions.push({ noteId, mention: mentionText });
    }
  }

  return mentions;
}
type ExtractedWikiLinkTargetValue =
  | string
  | { noteId: string; mention: string };
