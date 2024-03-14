import type { Room } from '../../model/rooms/schema';
import { isTokenExpired } from '@eweser/shared';
import { updateRoom } from '../../model/rooms/calls';
import { getOrCreateToken } from '../../services/y-sweet/get-or-create-token';
import type { DBInstance } from '../../services/database/drizzle/init';

export async function refreshTokenIfNeededAndSaveToRoom(
  room: Room,
  dbInstance: DBInstance
): Promise<{ token: string; ySweetUrl: string; tokenExpiry: string }> {
  const { token, ySweetUrl, tokenExpiry } = room;
  if (
    !token ||
    !ySweetUrl ||
    !tokenExpiry ||
    (tokenExpiry && isTokenExpired(tokenExpiry))
  ) {
    const refreshed = await getOrCreateToken(room.id);
    if (!refreshed.token || !refreshed.url) {
      throw new Error(`Could not get token for room ${room.id}`);
    }
    const updated = {
      token: refreshed.token,
      ySweetUrl: refreshed.url,
      tokenExpiry: refreshed.expiry,
    };
    await updateRoom({ ...room, ...updated }, dbInstance);
    return updated;
  }
  return { token, ySweetUrl, tokenExpiry };
}
