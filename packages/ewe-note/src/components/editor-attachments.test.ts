import type { FileAttachmentBase } from '@eweser/shared';
import { describe, expect, it } from 'vitest';
import {
  buildEditorAttachmentContext,
  collectNoteRoomAttachments,
} from './editor-attachments';

type AttachmentDocument = FileAttachmentBase & {
  _id: string;
  _deleted?: boolean;
};

function attachment(
  sourcePath: string,
  overrides: Partial<AttachmentDocument> = {}
): AttachmentDocument {
  const filename = sourcePath.split('/').pop() ?? sourcePath;
  return {
    _id: `attachment:${sourcePath}`,
    baseId: 'notes-room-1',
    contentHash: `hash:${sourcePath}`,
    filename,
    localAvailability: 'available',
    mimeType: 'image/png',
    size: 3,
    sourcePath,
    sourceVault: 'Test Vault',
    ...overrides,
  };
}

function roomWithAttachments(attachments: AttachmentDocument[]) {
  return {
    getDocuments() {
      return {
        getUndeleted() {
          return attachments.filter((entry) => !entry._deleted);
        },
      };
    },
  };
}

function unloadedRoom() {
  return {
    getDocuments() {
      throw new Error('attachment ydoc is still loading');
    },
  };
}

describe('editor attachment context helpers', () => {
  it('collects only file attachments belonging to the selected note room', () => {
    const attachments = collectNoteRoomAttachments(
      [
        roomWithAttachments([
          attachment('Assets/cover.png'),
          attachment('Assets/other-room.png', { baseId: 'other-room' }),
          attachment('Assets/deleted.png', { _deleted: true }),
        ]),
      ],
      'notes-room-1'
    );

    expect(attachments.map((entry) => entry.sourcePath)).toEqual([
      'Assets/cover.png',
    ]);
  });

  it('skips unloaded attachment rooms while collecting selected note attachments', () => {
    const attachments = collectNoteRoomAttachments(
      [unloadedRoom(), roomWithAttachments([attachment('Assets/cover.png')])],
      'notes-room-1'
    );

    expect(attachments.map((entry) => entry.sourcePath)).toEqual([
      'Assets/cover.png',
    ]);
  });

  it('builds markdown attachment context with note source path and materialized URLs', () => {
    const attachments = [attachment('Assets/cover.png')];
    const context = buildEditorAttachmentContext({
      attachmentUrls: { 'Assets/cover.png': 'blob:cover' },
      attachments,
      note: { sourcePath: 'Notes/Imported.md' },
    });

    expect(context).toEqual({
      attachmentUrls: { 'Assets/cover.png': 'blob:cover' },
      attachments,
      noteSourcePath: 'Notes/Imported.md',
    });
  });
});
