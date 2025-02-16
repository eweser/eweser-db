import type { Request, Response } from 'express';
import type { MatrixClient } from 'matrix-js-sdk';

import { handleJoinRoom } from '../rooms.js';

export interface ApiParamsJoinRoomGet {
  roomId: string;
  userId: string;
}
export const joinRoomGetHandler = async (
  req: Request,
  res: Response,
  matrixClient: MatrixClient
) => {
  const { roomId, userId } = req.params as unknown as ApiParamsJoinRoomGet;
  const result = await handleJoinRoom(matrixClient, roomId);
};
