import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import type { Editor, JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { mergeAttributes, Node } from '@tiptap/core';
import type { Extension } from '@tiptap/core';
import type { EditorCommandId } from '@/editor/commands';
import { getCommandById } from '@/editor/commands';
import { applyMarkdownInputRules } from '@/editor/input-rules';
import type { SlashMenuState } from '@/editor/slash-commands';
import { resolveSlashMenuState } from '@/editor/slash-commands';
import type { XmlFragment } from 'yjs';
import type { Note, Room } from '@eweser/db';
import type { AttachmentResolverContext } from '@/utils/attachment-resolver';
import {
  editorJsonToMarkdown,
  markdownToEditorHtml,
  slugHeading,
} from '@/editor/markdown';
import { EditorToolbar } from '@/components/editor-toolbar';
import {
  isSelectionInEmptyTaskItem,
  liftEmptyTaskItem,
  TaskItemWithExit,
} from '@/editor/task-item';
import { getTiptapFragment, isEmptyFragment } from '@/editor/yjs';
import { EditorContextMenu } from '@/components/editor-context-menu';
import { EditorBubbleMenu } from '@/components/editor-bubble-menu';
import { EditorSlashMenu } from '@/components/editor-slash-menu';
import { SourceModeEditor } from '@/components/source-mode-editor';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

type ProviderWithAwareness = NonNullable<Room<Note>['syncProvider']> & {
  awareness?: {
    setLocalStateField: (field: string, value: Record<string, unknown>) => void;
    states: Map<number, Record<string, unknown>>;
    on: (event: string, callback: () => void) => void;
    off?: (event: string, callback: () => void) => void;
  };
};

type XmlFragmentWithDoc = XmlFragment & {
  doc?: object | null;
};

interface TiptapEditorProps {
  note: Note;
  doc: NonNullable<Room<Note>['ydoc']>;
  provider?: Room<Note>['syncProvider'];
  selectedNoteId: string;
  onSaveMarkdown: (markdown: string, note: Note) => void;
  userName: string;
  userColor: string;
  onNavigateWikiLink?: (href: string) => void;
  onEditorReady?: (editor: Editor | null) => void;
  onEditorFocusChange?: (focused: boolean) => void;
  sourceMode?: boolean;
  onSourceModeChange?: (sourceMode: boolean) => void;
  attachmentContext?: AttachmentResolverContext;
}

interface LinkDialogState {
  open: boolean;
  kind: 'link' | 'external-link';
  href: string;
}

interface ShouldRefreshLocalEditorContentOptions {
  collaborationReady: boolean;
  focused: boolean;
  hasEditor: boolean;
  noteText: string;
  pendingEditorMarkdown: string | null;
  sourceMode: boolean;
}

function debounce(func: (markdown: string, note: Note) => void, wait: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: [string, Note] | null = null;

  const debounced = (...args: [string, Note]) => {
    lastArgs = args;
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      const nextArgs = lastArgs;
      timeout = null;
      lastArgs = null;
      if (nextArgs) func(...nextArgs);
    }, wait);
  };

  debounced.flush = () => {
    if (!timeout || !lastArgs) return;
    clearTimeout(timeout);
    const nextArgs = lastArgs;
    timeout = null;
    lastArgs = null;
    func(...nextArgs);
  };

  return debounced;
}

const HeadingWithAnchors = Heading.extend({
  renderHTML({ node, HTMLAttributes }) {
    const text = node.textContent;
    return [
      `h${node.attrs.level}`,
      {
        ...HTMLAttributes,
        'data-heading-anchor': slugHeading(text),
      },
      0,
    ];
  },
});

const ImageNode = Node.create({
  name: 'image',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute('width'),
      },
      height: {
        default: null,
        parseHTML: (element) => element.getAttribute('height'),
      },
      sourcePath: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute('data-ewe-attachment-source'),
        renderHTML: (attributes) =>
          attributes.sourcePath
            ? { 'data-ewe-attachment-source': attributes.sourcePath }
            : {},
      },
      originalSource: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-ewe-ofm-source'),
        renderHTML: (attributes) =>
          attributes.originalSource
            ? { 'data-ewe-ofm-source': attributes.originalSource }
            : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: 'img[src]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes)];
  },
});

function buildExtensions({
  fragment,
  provider,
  userName,
  userColor,
}: {
  fragment: XmlFragment;
  provider?: Room<Note>['syncProvider'];
  userName: string;
  userColor: string;
}) {
  const extensions: Extension[] = [
    StarterKit.configure({
      heading: false,
      history: provider ? false : undefined,
    }),
    HeadingWithAnchors.configure({ levels: [1, 2, 3, 4, 5, 6] }),
    Link.configure({
      autolink: false,
      openOnClick: false,
      protocols: ['wiki', 'vault'],
    }),
    ImageNode,
    Highlight,
    Table.configure({
      resizable: false,
    }),
    TableRow,
    TableHeader,
    TableCell,
    TaskList,
    TaskItemWithExit.configure({
      nested: true,
      HTMLAttributes: { 'data-type': 'taskItem' },
    }),
  ] as Extension[];

  if (!isCollaborationReady(fragment, provider)) return extensions;

  const providerWithAwareness = provider as ProviderWithAwareness;
  extensions.push(
    Collaboration.configure({ fragment }),
    CollaborationCursor.configure({
      provider: providerWithAwareness,
      user: { name: userName, color: userColor },
    })
  );

  return extensions;
}

export function isCollaborationReady(
  fragment: XmlFragment,
  provider?: Room<Note>['syncProvider']
): provider is ProviderWithAwareness {
  const providerWithAwareness = provider as ProviderWithAwareness | undefined;
  return Boolean(
    providerWithAwareness?.awareness && (fragment as XmlFragmentWithDoc).doc
  );
}

function saveEditor(
  editor: Editor,
  note: Note,
  save: (text: string, note: Note) => void
) {
  save(editorJsonToMarkdown(editor.getJSON() as JSONContent), note);
}

export function shouldRefreshLocalEditorContent({
  collaborationReady,
  focused,
  hasEditor,
  noteText,
  pendingEditorMarkdown,
  sourceMode,
}: ShouldRefreshLocalEditorContentOptions): boolean {
  if (!hasEditor || collaborationReady || sourceMode || focused) return false;
  return pendingEditorMarkdown === null || pendingEditorMarkdown === noteText;
}

export function TiptapEditor({
  note,
  doc,
  provider,
  selectedNoteId,
  onSaveMarkdown,
  userName,
  userColor,
  onNavigateWikiLink,
  onEditorReady,
  onEditorFocusChange,
  sourceMode = false,
  onSourceModeChange,
  attachmentContext,
}: TiptapEditorProps) {
  const noteRef = useRef(note);
  const fragment = useMemo(
    () => getTiptapFragment(doc, selectedNoteId),
    [doc, selectedNoteId]
  );
  const collaborationReady = isCollaborationReady(fragment, provider);
  const initialHtml = useMemo(
    () => markdownToEditorHtml(note.text, attachmentContext),
    [attachmentContext, note.text]
  );
  const debouncedSaveRef = useRef<ReturnType<typeof debounce> | null>(null);
  const pendingEditorMarkdownRef = useRef<string | null>(null);
  const suppressEditorSaveRef = useRef(false);
  const [slashMenuState, setSlashMenuState] = useState<SlashMenuState | null>(
    null
  );
  const [focused, setFocused] = useState(false);
  const [sourceValue, setSourceValue] = useState(note.text);
  const [linkDialog, setLinkDialog] = useState<LinkDialogState>({
    open: false,
    kind: 'link',
    href: '',
  });

  if (!debouncedSaveRef.current) {
    debouncedSaveRef.current = debounce(onSaveMarkdown, 750);
  }

  useEffect(() => {
    noteRef.current = note;
    if (pendingEditorMarkdownRef.current === note.text) {
      pendingEditorMarkdownRef.current = null;
    }
    if (!sourceMode) {
      setSourceValue(note.text);
    }
  }, [note, sourceMode]);

  const extensions = useMemo(
    () => buildExtensions({ fragment, provider, userName, userColor }),
    [fragment, provider, userColor, userName]
  );

  const editor = useEditor(
    {
      extensions,
      content: provider ? undefined : initialHtml,
      editorProps: {
        attributes: {
          class:
            'tiptap-prosemirror min-h-[45vh] w-full max-w-full outline-none',
          'data-cy': 'ewe-note-tiptap-editor',
        },
        handleClickOn(_view, _pos, node, _nodePos, event) {
          const target = event.target;
          if (!(target instanceof HTMLAnchorElement)) return false;
          const href = target.getAttribute('href') ?? '';
          if (!href.startsWith('wiki://')) return false;
          event.preventDefault();
          onNavigateWikiLink?.(href);
          return true;
        },
        handleKeyDown(_view, event) {
          if (
            event.key !== 'Enter' ||
            !isSelectionInEmptyTaskItem(_view.state)
          ) {
            return false;
          }

          event.preventDefault();
          return liftEmptyTaskItem(_view.state, _view.dispatch);
        },
      },
      onCreate({ editor }) {
        if (!collaborationReady || isEmptyFragment(fragment)) {
          editor.commands.setContent(initialHtml, false);
        }
        onEditorReady?.(editor);
      },
      onUpdate({ editor }) {
        if (suppressEditorSaveRef.current || sourceMode) {
          return;
        }

        const didApplyRule = applyMarkdownInputRules(editor);
        if (!didApplyRule) {
          setSlashMenuState(resolveSlashMenuState(editor));
        } else {
          setSlashMenuState(null);
        }

        const markdown = editorJsonToMarkdown(editor.getJSON() as JSONContent);
        pendingEditorMarkdownRef.current = markdown;
        debouncedSaveRef.current?.(markdown, noteRef.current);
      },
      onDestroy() {
        onEditorReady?.(null);
      },
      onFocus: () => {
        setFocused(true);
        onEditorFocusChange?.(true);
      },
      onBlur: () => {
        setSlashMenuState(null);
        setFocused(false);
        onEditorFocusChange?.(false);
      },
    },
    [selectedNoteId, doc, provider?.awareness]
  );

  useEffect(() => {
    const activeEditor = editor;
    if (
      !activeEditor ||
      !shouldRefreshLocalEditorContent({
        collaborationReady,
        focused,
        hasEditor: true,
        noteText: note.text,
        pendingEditorMarkdown: pendingEditorMarkdownRef.current,
        sourceMode,
      })
    ) {
      return;
    }

    suppressEditorSaveRef.current = true;
    activeEditor.commands.setContent(initialHtml, false);
    window.setTimeout(() => {
      suppressEditorSaveRef.current = false;
    }, 500);
  }, [collaborationReady, editor, focused, initialHtml, note.text, sourceMode]);

  const closeSlashMenu = useCallback(() => setSlashMenuState(null), []);
  const toggleSourceMode = useCallback(() => {
    if (!onSourceModeChange) return;

    if (!sourceMode && editor) {
      const markdown = editorJsonToMarkdown(editor.getJSON() as JSONContent);
      setSourceValue(markdown);
      debouncedSaveRef.current?.flush();
      onSaveMarkdown(markdown, noteRef.current);
      onSourceModeChange(true);
      return;
    }

    onSourceModeChange(false);
  }, [editor, onSaveMarkdown, onSourceModeChange, sourceMode]);

  const requestLink = useCallback(
    ({ kind, href }: { kind: 'link' | 'external-link'; href?: string }) => {
      setLinkDialog({
        open: true,
        kind,
        href: href ?? '',
      });
    },
    []
  );

  const commandContext = useMemo(
    () => ({
      sourceMode,
      toggleSourceMode,
      requestLink,
    }),
    [requestLink, sourceMode, toggleSourceMode]
  );

  const closeLinkDialog = useCallback(() => {
    setLinkDialog((prev) => ({ ...prev, open: false }));
  }, []);

  const submitLinkDialog = useCallback(() => {
    if (!editor) return;
    const href = linkDialog.href.trim();
    if (!href) return;

    editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    closeLinkDialog();
  }, [closeLinkDialog, editor, linkDialog.href]);

  const unsetLink = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    closeLinkDialog();
  }, [closeLinkDialog, editor]);

  const executeSlashCommand = useCallback(
    (commandId: EditorCommandId) => {
      if (!editor || !slashMenuState) return;
      const command = getCommandById(commandId);
      if (!command) {
        closeSlashMenu();
        return;
      }

      editor
        .chain()
        .focus()
        .deleteRange({ from: slashMenuState.from, to: slashMenuState.to })
        .run();
      command.execute(editor, commandContext);
      closeSlashMenu();
    },
    [editor, closeSlashMenu, commandContext, slashMenuState]
  );

  const saveSourceMarkdown = useCallback((nextValue: string) => {
    setSourceValue(nextValue);
    debouncedSaveRef.current?.(nextValue, noteRef.current);
  }, []);

  const exitSourceMode = useCallback(() => {
    debouncedSaveRef.current?.flush();
    onSaveMarkdown(sourceValue, noteRef.current);
    suppressEditorSaveRef.current = true;
    editor?.commands.setContent(
      markdownToEditorHtml(sourceValue, attachmentContext),
      false
    );
    window.setTimeout(() => {
      suppressEditorSaveRef.current = false;
    }, 500);
    onSourceModeChange?.(false);
  }, [
    attachmentContext,
    editor,
    onSaveMarkdown,
    onSourceModeChange,
    sourceValue,
  ]);

  useEffect(() => {
    if (!onSourceModeChange) return;

    const handleSourceModeShortcut = (event: KeyboardEvent) => {
      const hasModifier = event.metaKey || event.ctrlKey;
      if (!hasModifier || !event.shiftKey || event.key.toLowerCase() !== 's') {
        return;
      }

      event.preventDefault();
      if (sourceMode) {
        exitSourceMode();
      } else {
        toggleSourceMode();
      }
    };

    window.addEventListener('keydown', handleSourceModeShortcut);
    return () =>
      window.removeEventListener('keydown', handleSourceModeShortcut);
  }, [exitSourceMode, onSourceModeChange, sourceMode, toggleSourceMode]);

  useEffect(() => {
    if (!editor) return;

    const focusEvent = new CustomEvent('ewe-note-editor-focus', {
      detail: {
        editor,
        commandContext,
      },
    });
    window.dispatchEvent(focusEvent);
  }, [commandContext, editor, focused]);

  useEffect(() => {
    return () => debouncedSaveRef.current?.flush();
  }, []);

  if (!editor) return null;

  return (
    <div className="tiptap-editor">
      <EditorToolbar
        editor={editor}
        onSave={() => saveEditor(editor, noteRef.current, onSaveMarkdown)}
        focused={focused}
        commandContext={commandContext}
      />
      {sourceMode ? (
        <SourceModeEditor
          value={sourceValue}
          onChange={saveSourceMarkdown}
          onExit={exitSourceMode}
        />
      ) : (
        <EditorBubbleMenu editor={editor} commandContext={commandContext}>
          <EditorContextMenu editor={editor} commandContext={commandContext}>
            <EditorContent editor={editor} className="editor-view" />
          </EditorContextMenu>
        </EditorBubbleMenu>
      )}
      <EditorSlashMenu
        commandsOpenState={slashMenuState}
        onSelect={executeSlashCommand}
        onClose={closeSlashMenu}
      />
      <Dialog open={linkDialog.open} onOpenChange={closeLinkDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {linkDialog.kind === 'external-link'
                ? 'Insert external link'
                : 'Insert link'}
            </DialogTitle>
            <DialogDescription>
              {linkDialog.kind === 'external-link'
                ? 'Enter a full URL to apply to the selected text.'
                : 'Use a URL or a wiki target such as wiki://Note Name.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="ewe-note-link-href">Link target</Label>
            <Input
              id="ewe-note-link-href"
              data-cy="ewe-note-link-input"
              autoFocus
              placeholder={
                linkDialog.kind === 'external-link'
                  ? 'https://example.com'
                  : 'wiki://Note Name'
              }
              value={linkDialog.href}
              onChange={(event) =>
                setLinkDialog((prev) => ({ ...prev, href: event.target.value }))
              }
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  submitLinkDialog();
                }
              }}
            />
          </div>
          <DialogFooter>
            {editor.isActive('link') ? (
              <Button type="button" variant="outline" onClick={unsetLink}>
                Remove link
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={closeLinkDialog}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={submitLinkDialog}
              disabled={!linkDialog.href.trim()}
            >
              Apply link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
