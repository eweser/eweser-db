import { useEffect, useState } from 'react';
import type { Database, Note } from '@eweser/db';
import type { FileAttachmentBase } from '@eweser/shared';
import {
  getCachedBrowserAttachmentUrls,
  revokeCachedBrowserAttachmentUrls,
} from '@/app/lib/browser-attachment-cache';
import type { AttachmentResolverContext } from '@/utils/attachment-resolver';

type AttachmentRecord = FileAttachmentBase & {
  _deleted?: boolean;
};

type AttachmentDocuments = {
  getUndeleted: () =>
    | readonly AttachmentRecord[]
    | Readonly<Record<string, AttachmentRecord>>;
  onChange?: (listener: () => void) => void;
  documents?: {
    unobserve: (listener: () => void) => void;
  };
};

export type AttachmentRoomSource = {
  getDocuments: () => AttachmentDocuments;
};

type RoomCollectionSource = {
  collectionKey?: string;
};

function getAttachmentRooms(db: Database): AttachmentRoomSource[] {
  return db.getRooms('fileAttachments') as unknown as AttachmentRoomSource[];
}

function getLoadedAttachmentDocuments(
  room: AttachmentRoomSource
): AttachmentDocuments | undefined {
  try {
    return room.getDocuments();
  } catch {
    return undefined;
  }
}

function attachmentDocumentsToArray(
  documents:
    | readonly AttachmentRecord[]
    | Readonly<Record<string, AttachmentRecord>>
): AttachmentRecord[] {
  return Array.isArray(documents) ? [...documents] : Object.values(documents);
}

export function collectNoteRoomAttachments(
  attachmentRooms: readonly AttachmentRoomSource[],
  noteRoomId: string
): FileAttachmentBase[] {
  return attachmentRooms.flatMap((room) => {
    const documents = getLoadedAttachmentDocuments(room);
    if (!documents) return [];

    return attachmentDocumentsToArray(documents.getUndeleted()).filter(
      (attachment) => !attachment._deleted && attachment.baseId === noteRoomId
    );
  });
}

export function buildEditorAttachmentContext({
  attachmentUrls,
  attachments,
  note,
}: {
  attachmentUrls: Readonly<Record<string, string>>;
  attachments: readonly FileAttachmentBase[];
  note: Pick<Note, 'sourcePath'> | { sourcePath?: string };
}): AttachmentResolverContext {
  return {
    attachments,
    attachmentUrls,
    ...(note.sourcePath ? { noteSourcePath: note.sourcePath } : {}),
  };
}

function shouldResolveAttachments(
  note: Pick<Note, 'sourcePath'> | { sourcePath?: string },
  attachments: readonly FileAttachmentBase[],
  attachmentUrls: Readonly<Record<string, string>>
): boolean {
  return Boolean(
    note.sourcePath ||
    attachments.length > 0 ||
    Object.keys(attachmentUrls).length > 0
  );
}

export function useEditorAttachmentContext({
  db,
  note,
  noteRoomId,
}: {
  db: Database;
  note: Note;
  noteRoomId: string;
}): AttachmentResolverContext | undefined {
  const [attachmentRooms, setAttachmentRooms] = useState<
    AttachmentRoomSource[]
  >(() => getAttachmentRooms(db));
  const [attachments, setAttachments] = useState<FileAttachmentBase[]>(() =>
    collectNoteRoomAttachments(attachmentRooms, noteRoomId)
  );
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>(
    {}
  );

  useEffect(() => {
    const refreshAttachmentRooms = () => {
      setAttachmentRooms(getAttachmentRooms(db));
    };
    const handleRoomLoaded = (room: RoomCollectionSource) => {
      if (room.collectionKey === 'fileAttachments') {
        refreshAttachmentRooms();
      }
    };
    const handleRoomsLoaded = (rooms: readonly RoomCollectionSource[]) => {
      if (rooms.some((room) => room.collectionKey === 'fileAttachments')) {
        refreshAttachmentRooms();
      }
    };

    db.on('roomLoaded', handleRoomLoaded);
    db.on('roomsLoaded', handleRoomsLoaded);

    return () => {
      db.off('roomLoaded', handleRoomLoaded);
      db.off('roomsLoaded', handleRoomsLoaded);
    };
  }, [db]);

  useEffect(() => {
    const documents = attachmentRooms.flatMap((room) => {
      const attachmentDocuments = getLoadedAttachmentDocuments(room);
      return attachmentDocuments ? [attachmentDocuments] : [];
    });
    const refreshAttachments = () => {
      setAttachments(collectNoteRoomAttachments(attachmentRooms, noteRoomId));
    };

    refreshAttachments();
    for (const attachmentDocuments of documents) {
      attachmentDocuments.onChange?.(refreshAttachments);
    }

    return () => {
      for (const attachmentDocuments of documents) {
        attachmentDocuments.documents?.unobserve(refreshAttachments);
      }
    };
  }, [attachmentRooms, noteRoomId]);

  useEffect(() => {
    let active = true;

    getCachedBrowserAttachmentUrls(attachments)
      .then((nextUrls) => {
        if (!active) {
          revokeCachedBrowserAttachmentUrls(nextUrls);
          return;
        }
        setAttachmentUrls(nextUrls);
      })
      .catch(() => {
        if (active) setAttachmentUrls({});
      });

    return () => {
      active = false;
    };
  }, [attachments]);

  useEffect(
    () => () => revokeCachedBrowserAttachmentUrls(attachmentUrls),
    [attachmentUrls]
  );

  if (!shouldResolveAttachments(note, attachments, attachmentUrls)) {
    return undefined;
  }

  return buildEditorAttachmentContext({
    attachmentUrls,
    attachments,
    note,
  });
}
