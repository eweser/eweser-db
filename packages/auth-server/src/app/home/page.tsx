import { protectPage } from '@/modules/account/protect-page';
import { getOrCreateNewUsersProfileRooms } from '@/modules/rooms/create-new-user-profile-rooms';

import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Home',
};

export default async function Home() {
  const user = await protectPage();
  const profiles = await getOrCreateNewUsersProfileRooms(user.id);

  return (
    <div className="p-4 bg-gray-100 rounded-md shadow-md">
      <p>Hello {user.email}</p>
      <div className="p-2 bg-red-100">
        <h2>Public Profile</h2>
        <p>Public profile room: {profiles.publicProfile.name}</p>
      </div>
      <div className="p-2 bg-blue-100">
        <h2>Private Profile</h2>
        <p>Private profile room: {profiles.privateProfile.name}</p>
      </div>
    </div>
  );
}
