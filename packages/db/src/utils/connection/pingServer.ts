import type { Database } from '../..';

export const pingServer = (db: Database) => async () => {
  const token = db.getToken();

  try {
    const response = await fetch(
      `${db.authServer}/ping`,
      token
        ? {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        : undefined
    );

    if (!response.ok) {
      throw new Error(`Ping failed with status ${response.status}`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const data = (await response.json()) as { reply?: string };
      db.debug('Server pinged', data);
      return data.reply === 'pong';
    }

    const reply = (await response.text()).trim();
    db.debug('Server pinged', reply);
    return reply === 'pong';
  } catch (error) {
    db.error('Error pinging server', error);
    return false;
  }
};
