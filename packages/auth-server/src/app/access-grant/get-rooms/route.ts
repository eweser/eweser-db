import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { SERVER_SECRET } from '@/shared/constants';
import type { AccessGrantJWT } from '@/modules/account/access-grant/create-token-from-grant';
import { getAccessGrantById } from '@/model/access_grants';
import { getRoomsByIds } from '@/model/rooms/calls';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    const { token } = req.body;
    const { access_grant_id, roomIds } = jwt.verify(
      token,
      SERVER_SECRET
    ) as AccessGrantJWT;

    // check the grant real quick to make sure it's valid
    const grant = await getAccessGrantById(access_grant_id);
    if (!grant || !grant.isValid) {
      res.status(401).json({ message: 'Invalid access grant' });
      return;
    }
    const rooms = await getRoomsByIds(roomIds);

    res.status(200).json({ rooms });
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
