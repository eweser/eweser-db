import type { Database } from '../..';

export const pingServer = async (_db: Database) => {
  const MATRIX_HOME_URL = new URL(_db.baseUrl);
  MATRIX_HOME_URL.pathname = '_matrix/federation/v1/version';
  try {
    const res = await fetch(MATRIX_HOME_URL.toString());
    return res.status === 200;
  } catch (e) {
    // console.error(e);
    return false;
  }
};
