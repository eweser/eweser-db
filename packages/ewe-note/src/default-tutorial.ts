type TutorialStorageReader = Pick<Storage, 'getItem'>;
type TutorialStorageWriter = Pick<Storage, 'setItem'>;

export const DEFAULT_TUTORIAL_DISMISS_STORAGE_KEY =
  'ewe-note-default-tutorial-dismissed';
export const DEFAULT_TUTORIAL_DISMISS_LABEL = "Don't show this tutorial again";

export const DEFAULT_NOTE_AFTER_TUTORIAL_DISMISS_TEXT = '# Untitled\n\n';

const defaultTutorialDismissLine = `- [ ] ${DEFAULT_TUTORIAL_DISMISS_LABEL}`;
const defaultTutorialDismissCheckedPattern = new RegExp(
  `^\\s*[-*]\\s+\\[x\\]\\s+${escapeRegExp(DEFAULT_TUTORIAL_DISMISS_LABEL)}\\.?\\s*$`,
  'im'
);

export const DEFAULT_TUTORIAL_NOTE_TEXT = `# EweNote Tutorial

${defaultTutorialDismissLine}

This note is a writable tour of the editor. Keep it as a reference, edit it, or check the box above to dismiss it and start with a blank note next time.

## Fastest Ways To Work

| Action | Shortcut |
| --- | --- |
| Open command palette | Ctrl/Cmd+K |
| Create a new note | Ctrl/Cmd+N |
| Edit raw Markdown source | Ctrl/Cmd+Shift+S |
| Editor-only workspace | Ctrl/Cmd+1 |
| Editor + recent notes | Ctrl/Cmd+2 |
| Editor + recent notes + folders | Ctrl/Cmd+3 |
| Show the note info panel too | Ctrl/Cmd+4 |
| Toggle sidebar chrome | Ctrl/Cmd+\\ |
| Toggle topbar chrome | Ctrl/Cmd+Shift+\\ |
| Pure focus mode | Ctrl/Cmd+Shift+F |
| Exit focus mode or close a dialog | Escape |

Tip: press Ctrl/Cmd+K, then type \`/\` or \`>\` to run editor commands from the command palette. Type \`/\` in the note body for the inline slash menu.

## Formatting Sampler

Use **bold**, *italic*, ~~strikethrough~~, ==highlight==, and \`inline code\` in the same paragraph. Add an [external link](https://eweser.com) or a [[Daily Note|wiki link alias]] when you want notes to connect.

### Lists And Tasks

- Bulleted list item
- Another item with **formatting**

1. Numbered list item
2. Another numbered item

- [ ] Unchecked task
- [x] Completed task
  - [ ] Nested task; Tab indents and Shift+Tab outdents

> A regular quote is useful for excerpts, decisions, and copied context.

> [!tip]+ Foldable callout
> Callouts are Obsidian-style blocks. Try \`> [!warning]\` on a blank line, then press Enter.

### Tables

| Feature | Use it for |
| --- | --- |
| Tables | Comparisons, specs, and structured notes |
| Source mode | Exact Markdown edits |
| Wiki links | Personal knowledge graphs |

### Code Blocks

\`\`\`ts
const note = {
  localFirst: true,
  syncsWhenReady: true,
};
\`\`\`

---

## Obsidian-Style Features

- Wiki links: [[Project Plan]] and [[Project Plan#Decisions|jump to a heading]]
- Embeds: ![[diagram.png|640x480]]
- Comments: %%private source-only comment%%
- Math block:

$$
E = mc^2
$$

## Editor Command Reference

| Command | Shortcut or trigger |
| --- | --- |
| Paragraph | Ctrl/Cmd+0 or /paragraph |
| Heading 1 | Ctrl/Cmd+1 or /h1 |
| Heading 2 | Ctrl/Cmd+2 or /h2 |
| Heading 3 | Ctrl/Cmd+3 or /h3 |
| Heading 4 | /h4 |
| Heading 5 | /h5 |
| Heading 6 | /h6 |
| Quote | /quote |
| Bold | Ctrl/Cmd+B |
| Italic | Ctrl/Cmd+I |
| Strikethrough | Ctrl/Cmd+Shift+X |
| Highlight | Ctrl/Cmd+Shift+H |
| Inline code | Ctrl/Cmd+E |
| Code block | \`\`\` |
| Horizontal rule | --- |
| Bulleted list | /bullet |
| Numbered list | /numbered |
| Task list | /task |
| Link | Ctrl/Cmd+K or /link |
| External link | /url |
| Clear formatting | Ctrl/Cmd+Shift+X or /clear |
| Callout | /callout |
| Table | \`|\` |
| Embed | /embed |
| Comment | /comment |
| Math | /math |
| Source mode | Ctrl/Cmd+Shift+S |

If a shortcut belongs to your browser, operating system, or workspace panes, use the toolbar, bubble menu, right-click menu, slash menu, or command palette command instead.
`;

export function getDefaultNoteText(storage?: TutorialStorageReader) {
  return hasDismissedDefaultTutorial(storage)
    ? DEFAULT_NOTE_AFTER_TUTORIAL_DISMISS_TEXT
    : DEFAULT_TUTORIAL_NOTE_TEXT;
}

export function hasDismissedDefaultTutorial(
  storage?: TutorialStorageReader
): boolean {
  const targetStorage = storage ?? getBrowserStorage();
  return (
    targetStorage?.getItem(DEFAULT_TUTORIAL_DISMISS_STORAGE_KEY) === 'true'
  );
}

export function markDefaultTutorialDismissed(storage?: TutorialStorageWriter) {
  const targetStorage = storage ?? getBrowserStorage();
  targetStorage?.setItem(DEFAULT_TUTORIAL_DISMISS_STORAGE_KEY, 'true');
}

export function isDefaultTutorialDismissalChecked(markdown: string) {
  return defaultTutorialDismissCheckedPattern.test(markdown);
}

function getBrowserStorage() {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
