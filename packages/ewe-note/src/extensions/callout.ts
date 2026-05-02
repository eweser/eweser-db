/**
 * Callout block extension for Obsidian Flavored Markdown.
 *
 * Obsidian callout syntax:
 *   > [!type] Title
 *   > Content line 1
 *   > Content line 2
 *
 * Foldable variants:
 *   > [!type]+ Title   (expanded by default)
 *   > [!type]- Title   (collapsed by default)
 *
 * At the serialization layer, callouts are preserved as blockquotes and
 * rendered with callout styling via CSS class detection.
 */

/** All built-in Obsidian callout types */
export const CALLOUT_TYPES = [
  'note',
  'abstract',
  'summary',
  'tldr',
  'info',
  'todo',
  'tip',
  'hint',
  'important',
  'success',
  'check',
  'done',
  'question',
  'help',
  'faq',
  'warning',
  'caution',
  'attention',
  'failure',
  'fail',
  'missing',
  'danger',
  'error',
  'bug',
  'example',
  'quote',
  'cite',
] as const;

export type CalloutType = (typeof CALLOUT_TYPES)[number];

export interface CalloutInfo {
  type: CalloutType;
  title?: string;
  foldable: boolean;
  /** true = expanded default, false = collapsed default */
  defaultExpanded: boolean;
}

/** Regex to match the first line of a callout block: > [!type] Title */
const CALLOUT_HEADER_REGEX = /^> \[!([^\]]+)\]([+-]?)(.*)$/;

/**
 * Parse the header line of a callout block.
 * Returns null if the line is not a callout header.
 */
export function parseCalloutHeader(line: string): CalloutInfo | null {
  const match = line.match(CALLOUT_HEADER_REGEX);
  if (!match) return null;

  const rawType = (match[1] ?? '').toLowerCase().trim() as CalloutType;
  const foldChar = match[2] ?? '';
  const titleText = (match[3] ?? '').trim();

  const type = CALLOUT_TYPES.includes(rawType) ? rawType : 'note';
  const foldable = foldChar === '+' || foldChar === '-';
  const defaultExpanded = foldChar !== '-';

  const result: CalloutInfo = { type, foldable, defaultExpanded };
  if (titleText) result.title = titleText;
  return result;
}

/**
 * Serialize a callout back to Obsidian markdown.
 */
export function serializeCallout(
  info: CalloutInfo,
  bodyLines: string[]
): string {
  const fold = info.foldable ? (info.defaultExpanded ? '+' : '-') : '';
  const title = info.title ? ` ${info.title}` : '';
  const header = `> [!${info.type}]${fold}${title}`;
  const body = bodyLines.map((l) => `> ${l}`).join('\n');
  return body ? `${header}\n${body}` : header;
}

/**
 * Get an icon name (lucide-react compatible) for a callout type.
 */
export function getCalloutIcon(type: CalloutType): string {
  switch (type) {
    case 'note':
      return 'pencil';
    case 'abstract':
    case 'summary':
    case 'tldr':
      return 'clipboard-list';
    case 'info':
      return 'info';
    case 'todo':
      return 'check-square';
    case 'tip':
    case 'hint':
    case 'important':
      return 'flame';
    case 'success':
    case 'check':
    case 'done':
      return 'check-circle-2';
    case 'question':
    case 'help':
    case 'faq':
      return 'help-circle';
    case 'warning':
    case 'caution':
    case 'attention':
      return 'alert-triangle';
    case 'failure':
    case 'fail':
    case 'missing':
      return 'x-circle';
    case 'danger':
    case 'error':
      return 'zap';
    case 'bug':
      return 'bug';
    case 'example':
      return 'list';
    case 'quote':
    case 'cite':
      return 'quote';
    default:
      return 'pencil';
  }
}

/**
 * Get a Tailwind CSS color class for a callout type.
 */
export function getCalloutColor(type: CalloutType): string {
  switch (type) {
    case 'note':
      return 'blue';
    case 'abstract':
    case 'summary':
    case 'tldr':
      return 'cyan';
    case 'info':
      return 'blue';
    case 'todo':
      return 'blue';
    case 'tip':
    case 'hint':
    case 'important':
      return 'green';
    case 'success':
    case 'check':
    case 'done':
      return 'green';
    case 'question':
    case 'help':
    case 'faq':
      return 'yellow';
    case 'warning':
    case 'caution':
    case 'attention':
      return 'orange';
    case 'failure':
    case 'fail':
    case 'missing':
      return 'red';
    case 'danger':
    case 'error':
      return 'red';
    case 'bug':
      return 'red';
    case 'example':
      return 'purple';
    case 'quote':
    case 'cite':
      return 'gray';
    default:
      return 'blue';
  }
}
