import { getOrCreateDocAndToken } from '@y-sweet/sdk';
import { Y_SWEET_CONNECTION_STRING } from './config';

export async function getOrCreateToken(roomId: string) {
  return await getOrCreateDocAndToken(Y_SWEET_CONNECTION_STRING, roomId);
}
