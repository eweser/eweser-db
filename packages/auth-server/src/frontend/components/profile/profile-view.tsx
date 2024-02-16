import { getProfileRoomsByUserId } from '@/model/rooms/calls';

import type { User } from '@supabase/supabase-js';
import ProfileViewExport from './profile-view-frontend-export';

export async function ProfileView({ user }: { user: User }) {
  if (!user.email) {
    return null;
  }
  const profileRooms = await getProfileRoomsByUserId(user.id);
  if (!profileRooms || profileRooms.length < 2) {
    return null;
  }
  const publicProfileRoom = profileRooms.find(
    (room) => room.name === 'Public Profile'
  );
  const privateProfileRoom = profileRooms.find(
    (room) => room.name === 'Private Profile'
  );
  if (!publicProfileRoom || !privateProfileRoom) {
    return null;
  }

  return (
    <ProfileViewExport
      publicProfileRoom={publicProfileRoom}
      privateProfileRoom={privateProfileRoom}
      email={user.email || ''}
    />
  );
}
