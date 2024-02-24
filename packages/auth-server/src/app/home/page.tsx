import { ProfileView } from '../../frontend/components/profile/profile-view';
import { protectPage } from '../../modules/account/protect-page';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Home',
};

export default async function Home() {
  const user = await protectPage();

  return <ProfileView user={user} />;
}
