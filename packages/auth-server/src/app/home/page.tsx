import { ProfileView } from '@/frontend/components/profile/profile-view';
import { protectPage } from '@/modules/account/protect-page';
import { createNewUserRoomsAndAuthServerAccess } from '@/modules/account/create-new-user-rooms-and-auth-server-access';

import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Home',
};

export default async function Home() {
  const user = await protectPage();
  await createNewUserRoomsAndAuthServerAccess(user.id);

  return <ProfileView user={user} />;
}
