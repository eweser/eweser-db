import type { Doc } from 'yjs';
import type { Database } from '..';
import type { EweDocument, Room } from '../types';
import { getDocuments as sharedGetDocuments } from '@eweser/shared';

export type { GetDocuments } from '@eweser/shared';

export const getDocuments =
  (_db: Database) =>
  <T extends EweDocument>(room: Room<T>) => {
    if (!room) throw new Error('no room');
    if (!room.ydoc) throw new Error('no documents');
    return sharedGetDocuments(_db.authServer, room.collectionKey, room.id)<T>(
      room.ydoc as unknown as Doc
    );
  };

