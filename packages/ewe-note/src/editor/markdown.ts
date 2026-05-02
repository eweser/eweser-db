import type { JSONContent } from '@tiptap/react';
import MarkdownIt from 'markdown-it';
import { markdownToOfm, ofmToMarkdown } from '../extensions/ofm-serializer';

const markdown = new MarkdownIt({
  html: true,
  linkify: false,
  typographer: false,
});

export function slugHeading(text: string): string {
  return (
    text
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'heading'
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function preprocessTaskLines(source: string): string {
  const lines = source.split('\n');
  const output: string[] = [];
  let taskBuffer: string[] = [];

  const flushTasks = () => {
    if (taskBuffer.length === 0) return;
    output.push('<ul data-type="taskList">');
    taskBuffer.forEach((line) => output.push(line));
    output.push('</ul>');
    taskBuffer = [];
  };

  for (const line of lines) {
    const match = line.match(/^\s*[-*]\s+\[( |x|X)\]\s*(.*)$/);
    if (!match) {
      flushTasks();
      output.push(line);
      continue;
    }

    const checked = match[1].toLowerCase() === 'x';
    const text = escapeHtml(match[2] ?? '');
    taskBuffer.push(
      `<li data-type="taskItem" data-checked="${checked}"><p>${text}</p></li>`
    );
  }

  flushTasks();
  return output.join('\n');
}

function markdownToEditorMarkdown(source: string): string {
  return ofmToMarkdown(source).replace(/==([^=\n]+)==/g, (_match, text) => {
    return `<mark>${escapeHtml(String(text))}</mark>`;
  });
}

export function markdownToEditorHtml(source: string): string {
  const normalized = markdownToEditorMarkdown(source);
  return markdown.render(preprocessTaskLines(normalized));
}

function markText(text: string, marks: JSONContent['marks']): string {
  return (marks ?? []).reduce((value, mark) => {
    switch (mark.type) {
      case 'bold':
        return `**${value}**`;
      case 'italic':
        return `*${value}*`;
      case 'strike':
        return `~~${value}~~`;
      case 'code':
        return `\`${value}\``;
      case 'highlight':
        return `==${value}==`;
      case 'link': {
        const href = String(mark.attrs?.href ?? '');
        if (!href.startsWith('wiki://')) return `[${value}](${href})`;
        return markdownToOfm(`[${value}](${href})`);
      }
      default:
        return value;
    }
  }, text);
}

function renderInline(nodes: JSONContent[] = []): string {
  return nodes
    .map((node) => {
      if (node.type === 'text') {
        return markText(node.text ?? '', node.marks);
      }
      if (node.type === 'hardBreak') return '  \n';
      if (node.content) return renderInline(node.content);
      return '';
    })
    .join('');
}

function renderListItem(node: JSONContent, prefix: string): string {
  const children = node.content ?? [];
  const firstParagraph = children.find((child) => child.type === 'paragraph');
  const firstLine = `${prefix}${renderInline(firstParagraph?.content ?? [])}`;
  const nested = children
    .filter((child) => child !== firstParagraph)
    .flatMap((child) =>
      renderNode(child)
        .split('\n')
        .map((line) => `  ${line}`)
    )
    .filter((line) => line.trim().length > 0);
  return [firstLine, ...nested].join('\n');
}

function renderNode(node: JSONContent): string {
  switch (node.type) {
    case 'paragraph':
      return renderInline(node.content);
    case 'heading': {
      const level = Number(node.attrs?.level ?? 1);
      return `${'#'.repeat(Math.min(Math.max(level, 1), 6))} ${renderInline(
        node.content
      )}`;
    }
    case 'blockquote':
      return (node.content ?? [])
        .map(renderNode)
        .join('\n')
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n');
    case 'bulletList':
      return (node.content ?? [])
        .map((child) => renderListItem(child, '- '))
        .join('\n');
    case 'orderedList':
      return (node.content ?? [])
        .map((child, index) => renderListItem(child, `${index + 1}. `))
        .join('\n');
    case 'taskList':
      return (node.content ?? [])
        .map((child) =>
          renderListItem(child, child.attrs?.checked ? '- [x] ' : '- [ ] ')
        )
        .join('\n');
    case 'codeBlock':
      return `\`\`\`${node.attrs?.language ?? ''}\n${renderInline(
        node.content
      )}\n\`\`\``;
    case 'horizontalRule':
      return '---';
    default:
      return node.content ? renderInline(node.content) : '';
  }
}

export function editorJsonToMarkdown(doc: JSONContent): string {
  const body = (doc.content ?? [])
    .map(renderNode)
    .filter((block) => block.trim().length > 0)
    .join('\n\n');
  return markdownToOfm(body).trimEnd();
}
