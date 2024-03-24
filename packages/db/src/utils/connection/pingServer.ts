import type { Database } from '../..';

export const pingServer = (db: Database) => async () => {
  const { data, error } = await db.serverFetch<{ reply: string }>(
    '/access-grant/ping'
  );
  if (error) {
    db.error('Error pinging server', error);
    return false;
  } else {
    db.debug('Server pinged', data);
    return data?.reply && data.reply === 'pong';
  }
};
