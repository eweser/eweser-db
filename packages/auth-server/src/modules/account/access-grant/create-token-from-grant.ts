import type { AccessGrant } from '@/model/access_grants';
import { getRoomIdsFromAccessGrant } from '@/model/rooms/calls';
import { SERVER_SECRET } from '@/shared/server-constants';

import jwt from 'jsonwebtoken';

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
      'Requester type must be app. user requests not implemented yet'
    );
  }
  const requesterDomain = requesterId;
  if (requesterDomain !== domain) {
    throw new Error('Requester domain does not match');
  }
  const roomIds = await getRoomIdsFromAccessGrant(accessGrant);

  if (!roomIds || roomIds.length === 0) {
    throw new Error('No rooms found for access grant');
  }

  const accessGrantJwt: AccessGrantJWT = {
    access_grant_id: accessGrant.id,
    roomIds,
  };

  return jwt.sign(accessGrantJwt, SERVER_SECRET, {
    expiresIn: `${keepAliveDays}d`,
  });
}
