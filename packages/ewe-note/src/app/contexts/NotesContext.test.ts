import { describe, expect, it } from 'vitest';

import { collectFolderTreeIds } from './folder-tree';
import {
  buildDefaultUntitledNoteTitle,
  getFirstHeading,
  getSyncedTitle,
  isDefaultUntitledNoteTitle,
} from './note-titles';

describe('collectFolderTreeIds', () => {
  it('includes the selected folder and all descendants', () => {
    const folderIds = collectFolderTreeIds('root', [
      { id: 'root', parentId: null },
      { id: 'child-a', parentId: 'root' },
      { id: 'child-b', parentId: 'root' },
      { id: 'grandchild', parentId: 'child-a' },
      { id: 'other-root', parentId: null },
    ]);

    expect(folderIds).toEqual(
      new Set(['root', 'child-a', 'child-b', 'grandchild'])
    );
  });

  it('ignores unrelated branches and cycles safely', () => {
    const folderIds = collectFolderTreeIds('loop-a', [
      { id: 'loop-a', parentId: 'loop-b' },
      { id: 'loop-b', parentId: 'loop-a' },
      { id: 'other-root', parentId: null },
    ]);

    expect(folderIds).toEqual(new Set(['loop-a', 'loop-b']));
  });

  it('builds timestamped untitled note titles', () => {
    expect(buildDefaultUntitledNoteTitle(new Date('2026-05-04T09:07:00'))).toBe(
      '2026-05-04 09:07 Untitled'
    );
  });

  it('recognizes timestamped untitled note titles', () => {
    expect(isDefaultUntitledNoteTitle('2026-05-04 09:07 Untitled')).toBe(true);
    expect(isDefaultUntitledNoteTitle('Project brief')).toBe(false);
  });

  it('syncs generated and heading-backed titles without replacing explicit titles', () => {
    expect(getFirstHeading('# Unsynced TODO\n\nDraft')).toBe('Unsynced TODO');
    expect(
      getSyncedTitle(
        '2026-08-04 09:40 Untitled',
        '# 2026-08-04 09:40 Untitled',
        '# Unsynced TODO'
      )
    ).toBe('Unsynced TODO');
    expect(
      getSyncedTitle('Pinned title', '# Unsynced TODO', '# A different heading')
    ).toBeNull();
  });
});
