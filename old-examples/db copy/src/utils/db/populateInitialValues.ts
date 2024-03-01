import { randomString } from '..';
import type { Room, Document, CollectionKey } from '../../types';
import { getroomIdFromAlias } from '../connection';
import { buildRef } from './buildRef';
import { newDocument } from './newDocument';

export const populateInitialValues = <T extends Document>(
  initialValues: Partial<T>[],
  room: Room<T>
) => {
  const cleanupPassedInDocument = (doc: Partial<T>): T => {
    if (!doc) throw new Error('doc not provided');
    if (!room.roomId) throw new Error('roomId not set');
    const { _id, _ref, _created, _updated, _deleted, _ttl, ...rest } = doc;
    const roomId = getroomIdFromAlias(room.roomId);
    const newDoc = newDocument<T>(
      _ref ??
        buildRef({
          collectionKey: room.collectionKey as CollectionKey,
          roomId,
          documentId: _id ?? randomString(16),
        }),
      rest as any
    );
    if (_created) newDoc._created = _created;
    if (_updated) newDoc._updated = _updated;
    if (_deleted) newDoc._deleted = _deleted;
    if (_ttl) newDoc._ttl = _ttl;
    return newDoc;
  };
  const populatedInitialValues = initialValues.map(cleanupPassedInDocument);
  populatedInitialValues.forEach((doc) => {
    room.ydoc?.getMap('documents').set(doc._id, doc);
  });
};
