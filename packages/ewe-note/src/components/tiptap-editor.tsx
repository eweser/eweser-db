import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
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
import Collaboration, { isChangeOrigin } from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import {
  Editor as SeedEditor,
  createNodeFromContent,
  mergeAttributes,
  Node,
} from '@tiptap/core';
import type { Extension } from '@tiptap/core';
import type { EditorCommandId } from '@/editor/commands';
import { getCommandById } from '@/editor/commands';
import { applyMarkdownInputRules } from '@/editor/input-rules';
import type { SlashMenuState } from '@/editor/slash-commands';
import { resolveSlashMenuState } from '@/editor/slash-commands';
import type { Doc, XmlFragment } from 'yjs';
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
import { getTiptapFragment } from '@/editor/yjs';
import {
  currentNoteText,
  preserveEditorDraft,
  readPreservedEditorDraft,
  editorTextStates,
  persistEditorText,
  parseEditorTextState,
  readEditorTextState,
  replaceEditorText,
} from '@/editor/text-sync';
import { EditorContextMenu } from '@/components/editor-context-menu';
import { EditorBubbleMenu } from '@/components/editor-bubble-menu';
import { EditorSlashMenu } from '@/components/editor-slash-menu';
import { SourceModeEditor } from '@/components/source-mode-editor';
import {
  EWE_NOTE_PERFORMANCE_SPANS,
  measureEweNotePerformance,
} from '@/performance/ewe-note-performance';
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
  readOnly?: boolean;
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
  hasPendingEditorChanges: boolean;
  hasEditor: boolean;
  noteText: string;
  pendingEditorMarkdown: string | null;
  sourceMode: boolean;
}

interface InitialEditorHtmlState {
  html: string;
  selectedNoteId: string;
}

function debounce<TArgs extends unknown[]>(
  func: (...args: TArgs) => void,
  wait: number
) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: TArgs | null = null;

  const debounced = (...args: TArgs) => {
    lastArgs = args;
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      const nextArgs = lastArgs;
      timeout = null;
      lastArgs = null;
      if (nextArgs) func(...nextArgs);
    }, wait);
  };

  debounced.cancel = () => {
    if (timeout) clearTimeout(timeout);
    timeout = null;
    lastArgs = null;
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

function serializeEditorMarkdown(editor: Editor): string {
  const editorJson = measureEweNotePerformance(
    EWE_NOTE_PERFORMANCE_SPANS.editorSnapshot,
    () => editor.getJSON() as JSONContent,
    { itemCount: editor.state.doc.childCount }
  );
  return measureEweNotePerformance(
    EWE_NOTE_PERFORMANCE_SPANS.editorSerializeMarkdown,
    () => editorJsonToMarkdown(editorJson),
    { itemCount: editorJson.content?.length ?? 0 }
  );
}

function parseEditorMarkdown(
  markdown: string,
  attachmentContext?: AttachmentResolverContext
): string {
  return measureEweNotePerformance(
    EWE_NOTE_PERFORMANCE_SPANS.editorParseMarkdown,
    () => markdownToEditorHtml(markdown, attachmentContext),
    { inputSize: markdown.length }
  );
}

export function resolveInitialEditorHtml(
  current: InitialEditorHtmlState | null,
  selectedNoteId: string,
  markdown: string,
  attachmentContext?: AttachmentResolverContext
): InitialEditorHtmlState {
  if (current?.selectedNoteId === selectedNoteId) return current;
  return {
    selectedNoteId,
    html: parseEditorMarkdown(markdown, attachmentContext),
  };
}

export function shouldRefreshLocalEditorContent({
  collaborationReady,
  focused,
  hasPendingEditorChanges,
  hasEditor,
  noteText,
  pendingEditorMarkdown,
  sourceMode,
}: ShouldRefreshLocalEditorContentOptions): boolean {
  if (!hasEditor || sourceMode || focused || hasPendingEditorChanges) {
    return false;
  }
  // Shared fragments are replaced through an atomic pointer, never setContent.
  if (collaborationReady) return false;
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
  readOnly = false,
  sourceMode = false,
  onSourceModeChange,
  attachmentContext,
}: TiptapEditorProps) {
  const noteRef = useRef(note);
  noteRef.current = note;
  const ydoc = doc as unknown as Doc;
  const textStates = useMemo(() => editorTextStates(ydoc), [ydoc]);
  const subscribeTextState = useCallback(
    (notify: () => void) => {
      textStates.observe(notify);
      return () => textStates.unobserve(notify);
    },
    [textStates]
  );
  const getTextState = useCallback(
    () => textStates.get(selectedNoteId),
    [selectedNoteId, textStates]
  );
  const textStateValue = useSyncExternalStore(
    subscribeTextState,
    getTextState,
    getTextState
  );
  const textState = useMemo(
    () => parseEditorTextState(textStateValue),
    [textStateValue]
  );
  const fragmentName = textState?.fragmentName;
  const fragment = useMemo(
    () =>
      fragmentName
        ? ydoc.getXmlFragment(fragmentName)
        : getTiptapFragment(doc, selectedNoteId),
    [doc, ydoc, selectedNoteId, fragmentName]
  );
  const collaborationReady =
    !readOnly && isCollaborationReady(fragment, provider);
  const initialHtmlRef = useRef<InitialEditorHtmlState | null>(null);
  initialHtmlRef.current = resolveInitialEditorHtml(
    initialHtmlRef.current,
    selectedNoteId,
    note.text,
    attachmentContext
  );
  const initialHtml = initialHtmlRef.current.html;
  const debouncedEditorSaveRef = useRef<ReturnType<
    typeof debounce<[Editor, Note]>
  > | null>(null);
  const debouncedSourceSaveRef = useRef<ReturnType<
    typeof debounce<[string, Note]>
  > | null>(null);
  const hasPendingEditorChangesRef = useRef(false);
  const pendingEditorMarkdownRef = useRef<string | null>(null);
  const suppressEditorSaveRef = useRef(false);
  const [slashMenuState, setSlashMenuState] = useState<SlashMenuState | null>(
    null
  );
  const [focused, setFocused] = useState(false);
  const [preservedDraft, setPreservedDraft] = useState<string | null>(() =>
    readPreservedEditorDraft(ydoc, selectedNoteId)
  );
  const [sourceValue, setSourceValue] = useState(note.text);
  const [linkDialog, setLinkDialog] = useState<LinkDialogState>({
    open: false,
    kind: 'link',
    href: '',
  });

  const saveCallbacksRef = useRef({
    onSaveMarkdown,
    collaborationReady,
  });
  saveCallbacksRef.current = { onSaveMarkdown, collaborationReady };
  const populateFragment = useCallback(
    (target: XmlFragment, markdown: string) => {
      const seed = new SeedEditor({
        extensions: [
          ...buildExtensions({ fragment: target, userName, userColor }),
          Collaboration.configure({ fragment: target }),
        ],
      });
      try {
        seed.commands.setContent(
          parseEditorMarkdown(markdown, attachmentContext),
          false
        );
      } finally {
        seed.destroy();
      }
    },
    [attachmentContext, userName, userColor]
  );
  const persistMarkdown = useCallback(
    (activeEditor: Editor, expectedNote: Note) => {
      const markdown = serializeEditorMarkdown(activeEditor);
      const boundFragment = activeEditor.extensionManager.extensions.find(
        (extension) => extension.name === 'collaboration'
      )?.options.fragment as XmlFragment | undefined;
      const save = () =>
        saveCallbacksRef.current.onSaveMarkdown(
          markdown,
          boundFragment ? noteRef.current : expectedNote
        );
      const saved = boundFragment
        ? persistEditorText(ydoc, selectedNoteId, boundFragment, markdown, save)
        : currentNoteText(ydoc, selectedNoteId) === expectedNote.text &&
          (save(), currentNoteText(ydoc, selectedNoteId) === markdown);
      if (saved) pendingEditorMarkdownRef.current = markdown;
      else if (markdown !== currentNoteText(ydoc, selectedNoteId)) {
        if (!boundFragment) preserveEditorDraft(ydoc, selectedNoteId, markdown);
        setPreservedDraft(markdown);
      }
      return saved;
    },
    [selectedNoteId, ydoc]
  );
  const persistSource = useCallback(
    (markdown: string, expectedNote: Note) => {
      if (currentNoteText(ydoc, selectedNoteId) !== expectedNote.text) {
        preserveEditorDraft(ydoc, selectedNoteId, markdown);
        setPreservedDraft(markdown);
        return false;
      }
      let saved = false;
      ydoc.transact(() => {
        saveCallbacksRef.current.onSaveMarkdown(markdown, expectedNote);
        if (currentNoteText(ydoc, selectedNoteId) !== markdown) return;
        if (saveCallbacksRef.current.collaborationReady) {
          replaceEditorText(ydoc, selectedNoteId, markdown, (target) =>
            populateFragment(target, markdown)
          );
        }
        pendingEditorMarkdownRef.current = markdown;
        saved = true;
      });
      return saved;
    },
    [populateFragment, selectedNoteId, ydoc]
  );
  const persistCallbacksRef = useRef({ persistMarkdown, persistSource });
  persistCallbacksRef.current = { persistMarkdown, persistSource };
  if (!debouncedEditorSaveRef.current) {
    debouncedEditorSaveRef.current = debounce((activeEditor, expectedNote) => {
      if (!activeEditor.isDestroyed)
        persistCallbacksRef.current.persistMarkdown(activeEditor, expectedNote);
    }, 750);
  }
  if (!debouncedSourceSaveRef.current) {
    debouncedSourceSaveRef.current = debounce((markdown, expectedNote) => {
      persistCallbacksRef.current.persistSource(markdown, expectedNote);
    }, 750);
  }

  useEffect(() => {
    noteRef.current = note;
    if (pendingEditorMarkdownRef.current === note.text) {
      pendingEditorMarkdownRef.current = null;
      hasPendingEditorChangesRef.current = false;
    }
    if (!sourceMode) {
      setSourceValue(note.text);
    }
  }, [note, sourceMode]);

  const extensions = useMemo(
    () =>
      buildExtensions({
        fragment,
        provider: readOnly ? undefined : provider,
        userName,
        userColor,
      }),
    [fragment, provider, readOnly, userColor, userName]
  );

  const shouldMirrorCollaborativeChanges = useCallback(
    (activeEditor: Editor) => {
      const state = readEditorTextState(ydoc, selectedNoteId);
      const boundFragment = activeEditor.extensionManager.extensions.find(
        (extension) => extension.name === 'collaboration'
      )?.options.fragment as XmlFragment | undefined;
      const text = currentNoteText(ydoc, selectedNoteId);
      if (
        !state ||
        text !== state.markdown ||
        boundFragment !== ydoc.getXmlFragment(state.fragmentName)
      )
        return false;
      const expectedJson = createNodeFromContent(
        parseEditorMarkdown(text, attachmentContext),
        activeEditor.schema,
        { slice: false }
      ).toJSON();
      return (
        JSON.stringify(expectedJson) !== JSON.stringify(activeEditor.getJSON())
      );
    },
    [attachmentContext, selectedNoteId, ydoc]
  );

  const editor = useEditor(
    {
      extensions,
      editable: !readOnly,
      content: collaborationReady ? undefined : initialHtml,
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
        if (!collaborationReady) {
          editor.commands.setContent(initialHtml, false);
        }
        if (collaborationReady && shouldMirrorCollaborativeChanges(editor)) {
          hasPendingEditorChangesRef.current = true;
          debouncedEditorSaveRef.current?.(editor, noteRef.current);
        }
        onEditorReady?.(editor);
      },
      onUpdate({ editor, transaction }) {
        if (
          !transaction.docChanged ||
          readOnly ||
          suppressEditorSaveRef.current ||
          sourceMode
        ) {
          return;
        }

        if (isChangeOrigin(transaction)) {
          // Mirror real peer edits only when source and active generation agree.
          // Hydration and superseded fragment updates must not normalize or save.
          if (shouldMirrorCollaborativeChanges(editor)) {
            hasPendingEditorChangesRef.current = true;
            debouncedEditorSaveRef.current?.(editor, noteRef.current);
          }
          return;
        }

        const didApplyRule = measureEweNotePerformance(
          EWE_NOTE_PERFORMANCE_SPANS.editorInputRules,
          () => applyMarkdownInputRules(editor),
          { itemCount: editor.state.doc.childCount }
        );
        if (!didApplyRule) {
          setSlashMenuState(
            measureEweNotePerformance(
              EWE_NOTE_PERFORMANCE_SPANS.editorSlashMenu,
              () => resolveSlashMenuState(editor),
              { itemCount: editor.state.doc.childCount }
            )
          );
        } else {
          setSlashMenuState(null);
        }

        hasPendingEditorChangesRef.current = true;
        debouncedEditorSaveRef.current?.(editor, noteRef.current);
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
    [selectedNoteId, doc, provider?.awareness, readOnly, fragment]
  );

  useLayoutEffect(() => {
    if (!collaborationReady || !editor) return;
    const state = readEditorTextState(ydoc, selectedNoteId);
    const authoritativeText =
      currentNoteText(ydoc, selectedNoteId) ?? note.text;
    const boundFragment = editor.extensionManager.extensions.find(
      (extension) => extension.name === 'collaboration'
    )?.options.fragment as XmlFragment | undefined;
    const pointerChanged =
      boundFragment !== undefined && boundFragment !== fragment;
    const externallyReplaced = state?.markdown !== authoritativeText;
    if (!pointerChanged && !externallyReplaced) return;
    if (
      hasPendingEditorChangesRef.current &&
      pendingEditorMarkdownRef.current !== authoritativeText
    ) {
      const draft = sourceMode ? sourceValue : serializeEditorMarkdown(editor);
      preserveEditorDraft(ydoc, selectedNoteId, draft);
      setPreservedDraft(draft);
    }
    debouncedEditorSaveRef.current?.cancel();
    debouncedSourceSaveRef.current?.cancel();
    hasPendingEditorChangesRef.current = false;
    pendingEditorMarkdownRef.current = null;
    if (sourceMode) setSourceValue(authoritativeText);
    if (externallyReplaced) {
      replaceEditorText(ydoc, selectedNoteId, authoritativeText, (target) =>
        populateFragment(target, authoritativeText)
      );
    }
  }, [
    collaborationReady,
    editor,
    fragment,
    note.text,
    populateFragment,
    selectedNoteId,
    sourceMode,
    sourceValue,
    textStateValue,
    ydoc,
  ]);

  useEffect(() => {
    editor?.setEditable(!readOnly, false);
    if (readOnly && sourceMode) {
      onSourceModeChange?.(false);
    }
  }, [editor, onSourceModeChange, readOnly, sourceMode]);

  useEffect(() => {
    const activeEditor = editor;
    if (
      !activeEditor ||
      !shouldRefreshLocalEditorContent({
        collaborationReady,
        focused,
        hasPendingEditorChanges: hasPendingEditorChangesRef.current,
        hasEditor: true,
        noteText: note.text,
        pendingEditorMarkdown: pendingEditorMarkdownRef.current,
        sourceMode,
      })
    ) {
      return;
    }

    suppressEditorSaveRef.current = true;
    activeEditor.commands.setContent(
      parseEditorMarkdown(note.text, attachmentContext),
      false
    );
    window.setTimeout(() => {
      suppressEditorSaveRef.current = false;
    }, 500);
  }, [
    attachmentContext,
    collaborationReady,
    editor,
    focused,
    note.text,
    sourceMode,
  ]);

  const closeSlashMenu = useCallback(() => setSlashMenuState(null), []);
  const toggleSourceMode = useCallback(() => {
    if (readOnly || !onSourceModeChange) return;

    if (!sourceMode && editor) {
      debouncedEditorSaveRef.current?.cancel();
      if (hasPendingEditorChangesRef.current)
        persistMarkdown(editor, noteRef.current);
      setSourceValue(
        currentNoteText(ydoc, selectedNoteId) ?? noteRef.current.text
      );
      onSourceModeChange(true);
      return;
    }

    onSourceModeChange(false);
  }, [
    editor,
    persistMarkdown,
    onSourceModeChange,
    readOnly,
    sourceMode,
    selectedNoteId,
    ydoc,
  ]);

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

  const saveSourceMarkdown = useCallback(
    (nextValue: string) => {
      if (readOnly) return;
      setSourceValue(nextValue);
      hasPendingEditorChangesRef.current = true;
      debouncedSourceSaveRef.current?.(nextValue, noteRef.current);
    },
    [readOnly]
  );

  const exitSourceMode = useCallback(() => {
    debouncedSourceSaveRef.current?.cancel();
    if (!persistSource(sourceValue, noteRef.current)) return;
    if (!collaborationReady) {
      suppressEditorSaveRef.current = true;
      editor?.commands.setContent(
        parseEditorMarkdown(sourceValue, attachmentContext),
        false
      );
      suppressEditorSaveRef.current = false;
    }
    onSourceModeChange?.(false);
  }, [
    attachmentContext,
    collaborationReady,
    editor,
    onSourceModeChange,
    persistSource,
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
    return () => {
      debouncedEditorSaveRef.current?.flush();
      debouncedSourceSaveRef.current?.flush();
    };
  }, []);

  if (!editor) return null;

  return (
    <div className="tiptap-editor">
      {preservedDraft !== null ? (
        <details
          className="mb-4 rounded border border-border p-3"
          data-cy="ewe-note-preserved-draft"
        >
          <summary>
            Another update arrived. Your unsaved text is preserved here.
          </summary>
          <textarea
            aria-label="Preserved unsaved text"
            readOnly
            value={preservedDraft}
            className="mt-2 min-h-32 w-full"
          />
        </details>
      ) : null}
      {readOnly ? (
        <div
          className="mb-4 inline-flex rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground"
          data-cy="ewe-note-read-only-badge"
          role="status"
        >
          Read only
        </div>
      ) : (
        <EditorToolbar
          editor={editor}
          onSave={() => persistMarkdown(editor, noteRef.current)}
          focused={focused}
          commandContext={commandContext}
        />
      )}
      {!readOnly && sourceMode ? (
        <SourceModeEditor
          value={sourceValue}
          onChange={saveSourceMarkdown}
          onExit={exitSourceMode}
        />
      ) : readOnly ? (
        <EditorContent editor={editor} className="editor-view" />
      ) : (
        <EditorBubbleMenu editor={editor} commandContext={commandContext}>
          <EditorContextMenu editor={editor} commandContext={commandContext}>
            <EditorContent editor={editor} className="editor-view" />
          </EditorContextMenu>
        </EditorBubbleMenu>
      )}
      {!readOnly ? (
        <EditorSlashMenu
          commandsOpenState={slashMenuState}
          onSelect={executeSlashCommand}
          onClose={closeSlashMenu}
        />
      ) : null}
      <Dialog
        open={!readOnly && linkDialog.open}
        onOpenChange={closeLinkDialog}
      >
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
                setLinkDialog((prev) => ({
                  ...prev,
                  href: event.target.value,
                }))
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
