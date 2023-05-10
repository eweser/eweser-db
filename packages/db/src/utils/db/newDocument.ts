import type { DocumentBase, DocumentWithoutBase, Document } from '../../types';

/** Sets the metadata like created and updated for the doc */
export const newDocument = <T extends Document>(
  _ref: string,
  doc: DocumentWithoutBase<T>
): T => {
  const _id = _ref.split('.').pop();
  if (!_id) throw new Error('no _id found in ref');

  const now = new Date().getTime();
  const base: DocumentBase = {
    _created: now,
    _id,
    _ref,
    _updated: now,
    _deleted: false,
    _ttl: undefined,
  };
  // @ts-ignore
  return { ...base, ...doc };
};
