import type { MatrixClient } from 'matrix-js-sdk';

import { buildSpaceroomId } from './aliasHelpers';

export const registerRoomToSpace = async (
  matrixClient: MatrixClient,
  roomId: string
) => {
  const userId = matrixClient.getUserId();
  if (!userId) throw new Error('userId not found');
  const spaceAlias = buildSpaceroomId(userId);
  const spaceIdRes = await matrixClient.getRoomIdForAlias(spaceAlias);
  if (!spaceIdRes) throw new Error('space not found');
  const spaceId = spaceIdRes.room_id;

  const host = spaceId.split(':')[1];

  // const registerToSpaceRes =
  await matrixClient.sendStateEvent(
    spaceId,
    'm.space.child',
    { via: host },
    roomId
  );
  // console.log({ registerToSpaceRes });
  // const hierarchy = await matrixClient.getRoomHierarchy(spaceId);
  // console.log({ hierarchy });
};
