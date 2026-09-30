import {
  clearLocalUserId,
  getLocalAccessGrantToken,
} from '../../utils/localStorageService.js';
import type { Database } from '../../index.js';

export const getToken =
  (db: Database) =>
  /**
   * Looks for the access grant token first in the DB class, then in local storage, then in the url query params
   */
  () => {
    const savedToken = getLocalAccessGrantToken(db)();
    const urlToken = db.getAccessGrantTokenFromUrl();
    if (urlToken) {
      if (urlToken !== savedToken) {
        // A new access grant may belong to another user. Wait for the server
        // to verify it before using a previous user's cached room grants.
        db.userId = '';
        clearLocalUserId(db)();
      }
      db.accessGrantToken = urlToken;
      return urlToken;
    }
    if (db.accessGrantToken) {
      return db.accessGrantToken;
    }
    if (savedToken) {
      db.accessGrantToken = savedToken;
      return savedToken;
    }
    return null;
  };
