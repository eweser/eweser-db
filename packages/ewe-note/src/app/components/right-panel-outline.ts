import { slugHeading } from '../../editor/markdown';

export function extractMarkdownOutline(markdown: string) {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const headings: Array<{ level: number; text: string; id: string }> = [];
  let match;
  while ((match = headingRegex.exec(markdown)) !== null) {
    headings.push({
      level: match[1].length,
      text: match[2],
      id: slugHeading(match[2]),
    });
  }
  return headings;
}
