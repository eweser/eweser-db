import { getOrCreateDocAndToken } from '@y-sweet/sdk';
import { Y_SWEET_CONNECTION_STRING } from './config';
import { logger } from '../../shared/utils';

export async function getOrCreateToken(roomId: string) {
  try {
    return await getOrCreateDocAndToken(Y_SWEET_CONNECTION_STRING, roomId);
  } catch (error) {
    logger(error);
    // hide the error because it exposes y-sweet url
    throw new Error('Failed to get or create doc token');
  }
}
