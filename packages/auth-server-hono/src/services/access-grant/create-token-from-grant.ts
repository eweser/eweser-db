import jwt from 'jsonwebtoken';
import type { AccessGrant } from '../../model/access_grants.js';
import { getRoomIdsFromAccessGrant } from '../../model/rooms/calls.js';
import { env } from '../../env.js';

export interface AccessGrantJWT {
  access_grant_id: string;
  roomIds: string[];
}

export async function createTokenFromAccessGrant(
  accessGrant: AccessGrant,
  domain: string
): Promise<string> {
  const { keepAliveDays, isValid, requesterId, requesterType } = accessGrant;

  if (!isValid) {
    throw new Error('Access grant is not valid');
  }
  if (requesterType !== 'app') {
    throw new Error(
      'Requester type must be app. User requests not implemented yet'
    );
  }
  if (requesterId !== domain) {
    throw new Error('Requester domain does not match');
  }

  const roomIds = await getRoomIdsFromAccessGrant(accessGrant);
  if (!roomIds || roomIds.length === 0) {
    throw new Error('No rooms found for access grant');
  }

  const payload: AccessGrantJWT = {
    access_grant_id: accessGrant.id,
    roomIds,
  };

  return jwt.sign(payload, env.SERVER_SECRET, {
    expiresIn: `${keepAliveDays * 24}h`,
  });
}
