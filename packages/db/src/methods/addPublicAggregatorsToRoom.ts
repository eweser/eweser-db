import type { Database } from '..';
import type { Document, Room, DBEvent } from '../types';
import { WebSocket } from 'ws';
import {
  sendMessage,
  waitForMessage,
  waitForSocketState,
} from '@eweser/websockets';
// Because we changed the 'publicRoom' setting to allow any user to join the room, we don't need to send an invite, just tell the aggregator to join. But keeping this code cause it was a bit tricky, and keep it just in case we go back to requiring invites.
// const sendInvite = async (
//   matrixClient: MatrixClient,
//   aggregator: AggregatorInfo,
//   roomId: string,
//   tries=0
// ) => {
//   if(tries > 3) throw new Error('too many tries')
//   try {
//     await matrixClient.invite(roomId, aggregator.userId, (err, data) => {
//       if (err) {
//         console.log('invite matrix error', err);
//         logger(
//           'error inviting aggregator' + JSON.stringify(err),
//           data,
//           'error'
//         );
//         results.push(err);
//       } else {
//         logger('invited aggregator: ' + aggregator.userId, data);
//       }
//     });
//   } catch (err) {
//     if (
//       err?.data?.errcode === 'M_LIMIT_EXCEEDED' &&
//       typeof err.data.retry_after_ms === 'number'
//     ) {
//       await wait(err.data.retry_after_ms + 500);
//       try {
//         await sendInvite(matrixClient, aggregator, roomId, tries + 1);
//       } catch (error) {
//         logger(
//           'error inviting aggregator' + JSON.stringify(err),
//           err,
//           'error'
//         );
//         results.push(err);
//       }
//     } else {
//       logger('error inviting aggregator' + JSON.stringify(err), err, 'error');
//       results.push(err);
//     }
//   }
// };

/**
 *
 * @returns a list of failed roomIds
 */
export async function addPublicAggregatorsToRoom<T extends Document>(
  this: Database,
  room: Room<T>
) {
  const logger = (
    message: string,
    data?: any,
    level: DBEvent['level'] = 'info'
  ) => {
    this.emit({
      event: 'addPublicAggregatorsToRoom',
      message,
      data: { raw: data },
      level,
    });
  };
  logger('start addPublicAggregatorsToRoom');
  const roomId = room.roomId;
  if (!roomId) throw new Error('missing roomId');
  if (!this.matrixClient) throw new Error('missing matrixClient');
  if (this.publicAggregators.length === 0)
    throw new Error('no aggregators to add');
  const results: string[] = [];

  const alertServerToJoinRoom = async (
    aggregatorUrl: string,
    roomId: string
  ) => {
    const socket = new WebSocket(aggregatorUrl);

    await waitForSocketState(socket, socket.OPEN);
    sendMessage(socket, { type: 'joinRoom', roomId });
    const res = await waitForMessage(socket, 'joinedRoom', {
      field: 'roomId',
      value: roomId,
    });

    if (!res) {
      results.push(roomId);
    }
  };

  for (const aggregator of this.publicAggregators) {
    await alertServerToJoinRoom(aggregator.url, roomId);
  }

  logger('finished adding aggregators', results);
  return results;
}
