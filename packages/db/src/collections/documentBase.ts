export type DocumentBase<T> = T & {
  /**
   * @example <collectionKey>.<roomID>.<documentID> == `notes.5.1`
   */
  _ref: string;
  /** uuid, matches outer id */
  _id: string;
  /** epoch time created with new Date().getTime() */
  _created: number;
  /** epoch time updated with new Date().getTime() */
  _updated: number;
  _deleted?: boolean;
  /** time to live. an epoch time set when deleted flag is set. recommend one month from now
   * new Date().getTime() + 1000 * 60 * 60 * 24 * 30
   */
  _ttl?: number;
};
