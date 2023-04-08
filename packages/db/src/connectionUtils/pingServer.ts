import type { Database } from '..';

export const pingServer = async (_db: Database) => {
  const MATRIX_HOME_URL = new URL(_db.baseUrl);
  try {
    const res = await fetch(MATRIX_HOME_URL.toString());
    // console.log(res);
    return res.status === 200;
  } catch (e) {
    // console.error(e);
    return false;
  }
};
