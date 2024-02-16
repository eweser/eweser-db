import { ProfileView } from '@/frontend/components/profile/profile-view';
import { protectPage } from '@/modules/account/protect-page';
import { getOrCreateNewUsersProfileRooms } from '@/modules/rooms/create-new-user-profile-rooms';

import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Home',
};

export default async function Home() {
  const user = await protectPage();
  await getOrCreateNewUsersProfileRooms(user.id);

  return <ProfileView user={user} />;
}
