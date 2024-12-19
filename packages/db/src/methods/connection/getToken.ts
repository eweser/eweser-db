import { getLocalAccessGrantToken } from '../../utils/localStorageService';
import type { Database } from '../..';

export const getToken =
  (db: Database) =>
  /**
   * Looks for the access grant token first in the DB class, then in local storage, then in the url query params
   */
  () => {
    const urlToken = db.getAccessGrantTokenFromUrl();
    if (urlToken) {
      db.accessGrantToken = urlToken;
      return urlToken;
    }
    if (db.accessGrantToken) {
      return db.accessGrantToken;
    }
    const savedToken = getLocalAccessGrantToken(db)();
    if (savedToken) {
      db.accessGrantToken = savedToken;
      return savedToken;
    }
    return null;
  };
