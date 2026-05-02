import type { Editor } from '@tiptap/core';
import {
  Bold,
  CheckSquare,
  Code,
  ExternalLink,
  FileCode,
  Hash,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Highlighter,
  Image,
  List,
  ListOrdered,
  Minus,
  Quote,
  Strikethrough,
  Table2,
  Type,
  Link,
  Sigma,
  MessageSquare,
  Italic,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type CommandGroupName =
  | 'paragraph'
  | 'format'
  | 'insert'
  | 'list'
  | 'document'
  | 'utility';

export type EditorCommandId =
  | 'paragraph'
  | 'heading-1'
  | 'heading-2'
  | 'heading-3'
  | 'heading-4'
  | 'heading-5'
  | 'heading-6'
  | 'quote'
  | 'bold'
  | 'italic'
  | 'strikethrough'
  | 'highlight'
  | 'code'
  | 'code-block'
  | 'horizontal-rule'
  | 'bullet-list'
  | 'ordered-list'
  | 'task-list'
  | 'link'
  | 'external-link'
  | 'clear-formatting'
  | 'insert-callout'
  | 'insert-table'
  | 'insert-embed'
  | 'insert-comment'
  | 'insert-math'
  | 'source-mode';

export interface EditorCommand {
  id: EditorCommandId;
  label: string;
  icon: LucideIcon;
  group: CommandGroupName;
  slashTrigger: string[];
  isActive: (editor: Editor) => boolean;
  isEnabled: (editor: Editor) => boolean;
  execute: (editor: Editor) => void;
  shortcut?: string;
  description?: string;
}

function replaceSelection(editor: Editor, content: string) {
  editor.chain().focus().deleteSelection().insertContent(content).run();
}

export const EDITOR_COMMANDS: EditorCommand[] = [
  {
    id: 'paragraph',
    label: 'Paragraph',
    icon: Type,
    group: 'paragraph',
    slashTrigger: ['p', 'paragraph'],
    isActive: (editor) => editor.isActive('paragraph'),
    isEnabled: () => true,
    execute: (editor) => editor.chain().focus().setParagraph().run(),
    shortcut: 'Ctrl/Cmd+0',
    description: 'Body paragraph',
  },
  {
    id: 'heading-1',
    label: 'Heading 1',
    icon: Heading1,
    group: 'paragraph',
    slashTrigger: ['h1', 'heading 1', 'h'],
    isActive: (editor) => editor.isActive('heading', { level: 1 }),
    isEnabled: () => true,
    execute: (editor) =>
      editor.chain().focus().toggleHeading({ level: 1 }).run(),
    shortcut: 'Ctrl/Cmd+1',
  },
  {
    id: 'heading-2',
    label: 'Heading 2',
    icon: Heading2,
    group: 'paragraph',
    slashTrigger: ['h2', 'heading 2'],
    isActive: (editor) => editor.isActive('heading', { level: 2 }),
    isEnabled: () => true,
    execute: (editor) =>
      editor.chain().focus().toggleHeading({ level: 2 }).run(),
    shortcut: 'Ctrl/Cmd+2',
  },
  {
    id: 'heading-3',
    label: 'Heading 3',
    icon: Heading3,
    group: 'paragraph',
    slashTrigger: ['h3', 'heading 3'],
    isActive: (editor) => editor.isActive('heading', { level: 3 }),
    isEnabled: () => true,
    execute: (editor) =>
      editor.chain().focus().toggleHeading({ level: 3 }).run(),
    shortcut: 'Ctrl/Cmd+3',
  },
  {
    id: 'heading-4',
    label: 'Heading 4',
    icon: Heading4,
    group: 'paragraph',
    slashTrigger: ['h4', 'heading 4'],
    isActive: (editor) => editor.isActive('heading', { level: 4 }),
    isEnabled: () => true,
    execute: (editor) =>
      editor.chain().focus().toggleHeading({ level: 4 }).run(),
  },
  {
    id: 'heading-5',
    label: 'Heading 5',
    icon: Heading5,
    group: 'paragraph',
    slashTrigger: ['h5', 'heading 5'],
    isActive: (editor) => editor.isActive('heading', { level: 5 }),
    isEnabled: () => true,
    execute: (editor) =>
      editor.chain().focus().toggleHeading({ level: 5 }).run(),
  },
  {
    id: 'heading-6',
    label: 'Heading 6',
    icon: Heading6,
    group: 'paragraph',
    slashTrigger: ['h6', 'heading 6'],
    isActive: (editor) => editor.isActive('heading', { level: 6 }),
    isEnabled: () => true,
    execute: (editor) =>
      editor.chain().focus().toggleHeading({ level: 6 }).run(),
  },
  {
    id: 'quote',
    label: 'Quote',
    icon: Quote,
    group: 'paragraph',
    slashTrigger: ['q', 'quote'],
    isActive: (editor) => editor.isActive('blockquote'),
    isEnabled: () => true,
    execute: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    id: 'bold',
    label: 'Bold',
    icon: Bold,
    group: 'format',
    slashTrigger: ['b', 'bold'],
    isActive: (editor) => editor.isActive('bold'),
    isEnabled: () => true,
    execute: (editor) => editor.chain().focus().toggleBold().run(),
    shortcut: 'Ctrl/Cmd+B',
  },
  {
    id: 'italic',
    label: 'Italic',
    icon: Italic,
    group: 'format',
    slashTrigger: ['i', 'italic'],
    isActive: (editor) => editor.isActive('italic'),
    isEnabled: () => true,
    execute: (editor) => editor.chain().focus().toggleItalic().run(),
    shortcut: 'Ctrl/Cmd+I',
  },
  {
    id: 'strikethrough',
    label: 'Strikethrough',
    icon: Strikethrough,
    group: 'format',
    slashTrigger: ['strike', 'strikethrough'],
    isActive: (editor) => editor.isActive('strike'),
    isEnabled: () => true,
    execute: (editor) => editor.chain().focus().toggleStrike().run(),
    shortcut: 'Ctrl/Cmd+Shift+X',
  },
  {
    id: 'highlight',
    label: 'Highlight',
    icon: Highlighter,
    group: 'format',
    slashTrigger: ['highlight', 'hi'],
    isActive: (editor) => editor.isActive('highlight'),
    isEnabled: () => true,
    execute: (editor) => editor.chain().focus().toggleHighlight().run(),
    shortcut: 'Ctrl/Cmd+Shift+H',
  },
  {
    id: 'code',
    label: 'Inline code',
    icon: Code,
    group: 'format',
    slashTrigger: ['code', 'inline code'],
    isActive: (editor) => editor.isActive('code'),
    isEnabled: () => true,
    execute: (editor) => editor.chain().focus().toggleCode().run(),
    shortcut: 'Ctrl/Cmd+E',
  },
  {
    id: 'code-block',
    label: 'Code block',
    icon: FileCode,
    group: 'format',
    slashTrigger: ['```', 'code block'],
    isActive: (editor) => editor.isActive('codeBlock'),
    isEnabled: () => true,
    execute: (editor) => editor.chain().focus().toggleCodeBlock().run(),
    shortcut: '```',
  },
  {
    id: 'horizontal-rule',
    label: 'Horizontal rule',
    icon: Minus,
    group: 'insert',
    slashTrigger: ['hr', 'line'],
    isActive: () => false,
    isEnabled: () => true,
    execute: (editor) => editor.chain().focus().setHorizontalRule().run(),
    shortcut: '---',
  },
  {
    id: 'bullet-list',
    label: 'Bulleted list',
    icon: List,
    group: 'list',
    slashTrigger: ['ul', 'bullet'],
    isActive: (editor) => editor.isActive('bulletList'),
    isEnabled: () => true,
    execute: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'ordered-list',
    label: 'Numbered list',
    icon: ListOrdered,
    group: 'list',
    slashTrigger: ['ol', 'numbered list', 'ordered list'],
    isActive: (editor) => editor.isActive('orderedList'),
    isEnabled: () => true,
    execute: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    id: 'task-list',
    label: 'Task list',
    icon: CheckSquare,
    group: 'list',
    slashTrigger: ['task', 'todo'],
    isActive: (editor) => editor.isActive('taskList'),
    isEnabled: () => true,
    execute: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    id: 'link',
    label: 'Link',
    icon: Link,
    group: 'insert',
    slashTrigger: ['link', 'wiki'],
    isActive: (editor) => editor.isActive('link'),
    isEnabled: () => true,
    execute: (editor) => {
      const href = window.prompt(
        'Link target (wiki://Name for internal links)'
      );
      if (!href) return;
      editor.commands.toggleLink({ href });
    },
    shortcut: 'Ctrl/Cmd+K',
  },
  {
    id: 'external-link',
    label: 'External link',
    icon: ExternalLink,
    group: 'insert',
    slashTrigger: ['url', 'ext'],
    isActive: (editor) => editor.isActive('link'),
    isEnabled: () => true,
    execute: (editor) => {
      const href = window.prompt('External URL');
      if (!href) return;
      editor.commands.toggleLink({ href });
    },
  },
  {
    id: 'clear-formatting',
    label: 'Clear formatting',
    icon: Hash,
    group: 'format',
    slashTrigger: ['clear', 'clear formatting', 'reset'],
    isActive: () => false,
    isEnabled: () => true,
    execute: (editor) =>
      editor.chain().focus().unsetAllMarks().clearNodes().run(),
    shortcut: 'Ctrl/Cmd+Shift+X',
  },
  {
    id: 'insert-callout',
    label: 'Callout',
    icon: Hash,
    group: 'insert',
    slashTrigger: ['callout', 'admonition'],
    isActive: () => false,
    isEnabled: () => true,
    execute: (editor) => {
      replaceSelection(editor, '> [!note]\n> ');
    },
  },
  {
    id: 'insert-table',
    label: 'Table',
    icon: Table2,
    group: 'insert',
    slashTrigger: ['table', 'tbl'],
    isActive: () => false,
    isEnabled: () => true,
    execute: (editor) => {
      replaceSelection(
        editor,
        '| Header 1 | Header 2 |\n| --- | --- |\n|  |  |'
      );
    },
    shortcut: '|',
  },
  {
    id: 'insert-embed',
    label: 'Embed',
    icon: Image,
    group: 'insert',
    slashTrigger: ['embed', 'media', 'attachment'],
    isActive: () => false,
    isEnabled: () => true,
    execute: (editor) => {
      const target = window.prompt(
        'Embed target (file name, heading, or media ref)'
      );
      if (!target) return;
      replaceSelection(editor, `![[${target}]]`);
    },
  },
  {
    id: 'insert-comment',
    label: 'Comment',
    icon: MessageSquare,
    group: 'format',
    slashTrigger: ['comment'],
    isActive: () => false,
    isEnabled: () => true,
    execute: (editor) => {
      const selection = editor.state.selection;
      if (selection.empty) {
        replaceSelection(editor, '%%%%');
        return;
      }

      const selectedText = editor.state.doc.textBetween(
        selection.from,
        selection.to,
        '\n'
      );
      replaceSelection(editor, `%%${selectedText}%%`);
    },
  },
  {
    id: 'insert-math',
    label: 'Math',
    icon: Sigma,
    group: 'format',
    slashTrigger: ['math', '$', 'latex'],
    isActive: () => false,
    isEnabled: () => true,
    execute: (editor) => {
      replaceSelection(editor, '$$\n\n$$');
    },
  },
  {
    id: 'source-mode',
    label: 'Source mode',
    icon: FileCode,
    group: 'utility',
    slashTrigger: ['source'],
    isActive: () => false,
    isEnabled: () => true,
    execute: () => {
      window.alert(
        'Source mode is planned. Rich markdown edits remain available in editor mode.'
      );
    },
  },
];

export const EDITOR_COMMAND_MAP = new Map(
  EDITOR_COMMANDS.map((command) => [command.id, command])
);

export function getCommandsByGroup(group: CommandGroupName) {
  return EDITOR_COMMANDS.filter((cmd) => cmd.group === group);
}

export function getCommandById(id: EditorCommandId) {
  return EDITOR_COMMAND_MAP.get(id) ?? null;
}

export function getSlashMatchCommands(query: string, limit = 20) {
  const normalized = query.toLowerCase().trim();
  if (!normalized) return EDITOR_COMMANDS.slice(0, limit);

  return EDITOR_COMMANDS.filter((command) => {
    const haystack = [
      command.label,
      ...(command.slashTrigger ?? []),
      command.description ?? '',
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalized);
  }).slice(0, limit);
}
