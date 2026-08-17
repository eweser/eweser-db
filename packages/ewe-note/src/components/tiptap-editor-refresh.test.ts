import { describe, expect, it } from 'vitest';
import { shouldRefreshLocalEditorContent } from './tiptap-editor';

describe('shouldRefreshLocalEditorContent', () => {
  it('blocks non-collaborative refreshes while local editor markdown has not reached the note', () => {
    expect(
      shouldRefreshLocalEditorContent({
        collaborationReady: false,
        focused: false,
        hasPendingEditorChanges: true,
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
        hasPendingEditorChanges: false,
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
        hasPendingEditorChanges: false,
        hasEditor: true,
        noteText: 'saved markdown',
        pendingEditorMarkdown: null,
        sourceMode: false,
      })
    ).toBe(true);
  });

  it('refreshes collaborative content when no local edit is pending', () => {
    expect(
      shouldRefreshLocalEditorContent({
        collaborationReady: true,
        focused: false,
        hasPendingEditorChanges: false,
        hasEditor: true,
        noteText: 'remote markdown',
        pendingEditorMarkdown: null,
        sourceMode: false,
      })
    ).toBe(true);
  });

  it('protects pending collaborative edits from remote refreshes', () => {
    expect(
      shouldRefreshLocalEditorContent({
        collaborationReady: true,
        focused: false,
        hasPendingEditorChanges: true,
        hasEditor: true,
        noteText: 'remote markdown',
        pendingEditorMarkdown: 'local markdown',
        sourceMode: false,
      })
    ).toBe(false);
  });

  it('blocks refreshes while focused, in source mode, or missing the editor', () => {
    const readyToRefresh = {
      collaborationReady: false,
      focused: false,
      hasPendingEditorChanges: false,
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
      shouldRefreshLocalEditorContent({ ...readyToRefresh, hasEditor: false })
    ).toBe(false);
  });
});
