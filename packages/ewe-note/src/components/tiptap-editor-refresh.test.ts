import { describe, expect, it } from 'vitest';
import { shouldRefreshLocalEditorContent } from './tiptap-editor';

describe('shouldRefreshLocalEditorContent', () => {
  it('blocks non-collaborative refreshes while local editor markdown has not reached the note', () => {
    expect(
      shouldRefreshLocalEditorContent({
        collaborationReady: false,
        focused: false,
        hasEditor: true,
        noteText: 'saved markdown',
        pendingEditorMarkdown: 'unsaved local markdown',
        sourceMode: false,
      })
    ).toBe(false);
  });

  it('allows non-collaborative refreshes once the pending local markdown matches the note', () => {
    expect(
      shouldRefreshLocalEditorContent({
        collaborationReady: false,
        focused: false,
        hasEditor: true,
        noteText: 'saved markdown',
        pendingEditorMarkdown: 'saved markdown',
        sourceMode: false,
      })
    ).toBe(true);
  });

  it('allows non-collaborative refreshes when no local edit is pending', () => {
    expect(
      shouldRefreshLocalEditorContent({
        collaborationReady: false,
        focused: false,
        hasEditor: true,
        noteText: 'saved markdown',
        pendingEditorMarkdown: null,
        sourceMode: false,
      })
    ).toBe(true);
  });

  it('blocks refreshes while focused, source mode, collaboration, or missing editor already own content', () => {
    const readyToRefresh = {
      collaborationReady: false,
      focused: false,
      hasEditor: true,
      noteText: 'saved markdown',
      pendingEditorMarkdown: null,
      sourceMode: false,
    };

    expect(
      shouldRefreshLocalEditorContent({ ...readyToRefresh, focused: true })
    ).toBe(false);
    expect(
      shouldRefreshLocalEditorContent({ ...readyToRefresh, sourceMode: true })
    ).toBe(false);
    expect(
      shouldRefreshLocalEditorContent({
        ...readyToRefresh,
        collaborationReady: true,
      })
    ).toBe(false);
    expect(
      shouldRefreshLocalEditorContent({ ...readyToRefresh, hasEditor: false })
    ).toBe(false);
  });
});
