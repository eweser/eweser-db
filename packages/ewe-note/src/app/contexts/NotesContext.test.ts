import { describe, expect, it } from 'vitest';

import { collectFolderTreeIds } from './folder-tree';
import { buildDefaultUntitledNoteTitle } from './note-titles';

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
});
