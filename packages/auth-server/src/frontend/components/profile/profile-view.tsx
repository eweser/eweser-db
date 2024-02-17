import ProfileViewFrontend from './profile-view-frontend';
import type { User } from '@supabase/supabase-js';
import { getRoomIdsFromAccessGrant, getRoomsByIds } from '@/model/rooms/calls';
import { createNewUserRoomsAndAuthServerAccess } from '@/modules/account/create-new-user-rooms-and-auth-server-access';

export async function ProfileView({ user }: { user: User }) {
  const { authServerAccessGrant } = await createNewUserRoomsAndAuthServerAccess(
    user.id
  );
  const roomIds = await getRoomIdsFromAccessGrant(authServerAccessGrant);
  const rooms = await getRoomsByIds(roomIds);
  if (!rooms || rooms.length < 2) {
    return null;
  }
  const publicProfileRoom = rooms.find(
    (room) => room.name === 'Public Profile'
  );
  const privateProfileRoom = rooms.find(
    (room) => room.name === 'Private Profile'
  );
  if (!publicProfileRoom || !privateProfileRoom) {
    return null;
  }

  return (
    <ProfileViewFrontend
      publicProfileRoom={publicProfileRoom}
      privateProfileRoom={privateProfileRoom}
      email={user.email ?? ''}
    />
  );
}
