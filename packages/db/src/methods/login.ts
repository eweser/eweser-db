import type { Database } from '..';

export const login = (db: Database) => async () => {
  const token = db.getToken();
  if (!token) {
    throw new Error('No token found');
  }
  const syncResult = await db.syncRegistry();
  if (!syncResult) {
    throw new Error('Failed to sync registry');
  }
  db.useYSweet = true;
  db.online = true;
  await db.loadRooms(db.registry); // connects the ySweet providers. Could make this more atomic in the future to avoid creating too many connections.
  db.emit('onLoggedInChange', true);
  return true;
};
