// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  EWE_NOTE_PERFORMANCE_SPANS,
  measureEweNotePerformance,
  measureEweNotePerformanceAsync,
  recordEweNotePerformance,
  summarizeEweNotePerformance,
} from './ewe-note-performance';

describe('Ewe Note performance probe', () => {
  beforeEach(() => {
    window.__EWE_NOTE_PERFORMANCE__ = { enabled: true, records: [] };
  });

  afterEach(() => {
    delete window.__EWE_NOTE_PERFORMANCE__;
    vi.restoreAllMocks();
  });

  it('does no measurement work while disabled', () => {
    window.__EWE_NOTE_PERFORMANCE__ = { enabled: false, records: [] };
    const now = vi.spyOn(performance, 'now');

    expect(
      measureEweNotePerformance(
        EWE_NOTE_PERFORMANCE_SPANS.editorInputRules,
        () => 'result',
        { inputSize: 900 }
      )
    ).toBe('result');
    expect(now).not.toHaveBeenCalled();
    expect(window.__EWE_NOTE_PERFORMANCE__.records).toEqual([]);
  });

  it('records content-free synchronous metadata even when the operation throws', () => {
    vi.spyOn(performance, 'now')
      .mockReturnValueOnce(10)
      .mockReturnValueOnce(23);

    expect(() =>
      measureEweNotePerformance(
        EWE_NOTE_PERFORMANCE_SPANS.editorSnapshot,
        () => {
          throw new Error('expected');
        },
        { itemCount: 2500, requestId: 4 }
      )
    ).toThrow('expected');

    expect(window.__EWE_NOTE_PERFORMANCE__?.records).toEqual([
      {
        name: EWE_NOTE_PERFORMANCE_SPANS.editorSnapshot,
        startTime: 10,
        duration: 13,
        thread: 'main',
        blocking: true,
        itemCount: 2500,
        requestId: 4,
      },
    ]);
    expect(
      JSON.stringify(window.__EWE_NOTE_PERFORMANCE__?.records)
    ).not.toMatch(/text|title|path|content/i);
  });

  it('records asynchronous spans after completion', async () => {
    vi.spyOn(performance, 'now')
      .mockReturnValueOnce(50)
      .mockReturnValueOnce(57.5);

    await expect(
      measureEweNotePerformanceAsync(
        EWE_NOTE_PERFORMANCE_SPANS.notesVaultWriteback,
        async () => 'saved',
        { itemCount: 3 }
      )
    ).resolves.toBe('saved');

    expect(window.__EWE_NOTE_PERFORMANCE__?.records[0]).toMatchObject({
      name: EWE_NOTE_PERFORMANCE_SPANS.notesVaultWriteback,
      duration: 7.5,
      thread: 'main',
      blocking: false,
      itemCount: 3,
    });
  });

  it('summarizes median, p95, and maximum by stage and thread', () => {
    const durations = [1, 2, 3, 4, 40];
    durations.forEach((duration, requestId) => {
      recordEweNotePerformance({
        name: EWE_NOTE_PERFORMANCE_SPANS.notesUnlinkedMentions,
        startTime: requestId,
        duration,
        thread: 'worker',
        blocking: false,
        requestId,
      });
    });
    recordEweNotePerformance({
      name: EWE_NOTE_PERFORMANCE_SPANS.notesUnlinkedMentions,
      startTime: 10,
      duration: 5,
      thread: 'main',
      blocking: true,
    });

    expect(
      summarizeEweNotePerformance(
        window.__EWE_NOTE_PERFORMANCE__?.records ?? []
      )
    ).toEqual([
      {
        name: EWE_NOTE_PERFORMANCE_SPANS.notesUnlinkedMentions,
        thread: 'worker',
        blocking: false,
        count: 5,
        median: 3,
        p95: 40,
        maximum: 40,
      },
      {
        name: EWE_NOTE_PERFORMANCE_SPANS.notesUnlinkedMentions,
        thread: 'main',
        blocking: true,
        count: 1,
        median: 5,
        p95: 5,
        maximum: 5,
      },
    ]);
  });
});
