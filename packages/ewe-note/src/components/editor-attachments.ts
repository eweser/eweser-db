import { useEffect, useMemo, useState } from 'react';
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
  return attachmentRooms.flatMap((room) =>
    attachmentDocumentsToArray(room.getDocuments().getUndeleted()).filter(
      (attachment) => !attachment._deleted && attachment.baseId === noteRoomId
    )
  );
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
  const attachmentRooms = useMemo<AttachmentRoomSource[]>(
    () => db.getRooms('fileAttachments') as unknown as AttachmentRoomSource[],
    [db]
  );
  const [attachments, setAttachments] = useState<FileAttachmentBase[]>(() =>
    collectNoteRoomAttachments(attachmentRooms, noteRoomId)
  );
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>(
    {}
  );

  useEffect(() => {
    const documents = attachmentRooms.map((room) => room.getDocuments());
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
