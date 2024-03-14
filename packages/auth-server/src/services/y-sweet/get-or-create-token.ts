import { getOrCreateDocAndToken } from '@y-sweet/sdk';
import { Y_SWEET_CONNECTION_STRING } from './config';
import { logger } from '../../shared/utils';

export async function getOrCreateToken(
  roomId: string,
  /** If using the non self-hosted default ySweet server, tokens are valid for 30 minutes */
  tokenValidMinutes = 30
) {
  try {
    const token = await getOrCreateDocAndToken(
      Y_SWEET_CONNECTION_STRING,
      roomId
    );
    const expiry = new Date(
      Date.now() + tokenValidMinutes * 60 * 1000
    ).toISOString();
    return { ...token, expiry };
  } catch (error) {
    logger(error);
    // hide the error because it exposes y-sweet url
    throw new Error('Failed to get or create doc token');
  }
}
