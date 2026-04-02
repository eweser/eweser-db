import type { Database } from '@eweser/db';
import { useEffect, useMemo, useState } from 'react';

export const useGetUserFromDb = (db: Database) => {
  const [user, setUser] = useState({
    firstName: '',
    lastName: '',
    avatar: '',
  });
  const [profilesLoaded, setProfilesLoaded] = useState(false);

  useEffect(() => {
    if (db) {
      db.on('roomLoaded', () => {
        if (db.getRooms('profiles').length > 1) {
          const profileRoom = db
            .getRooms('profiles')
            .find((room) => room.publicAccess === 'read');
          // console.log('profileRoom', profileRoom);
          if (profileRoom?.ydoc) setProfilesLoaded(true);
        }
      });
    }
  }, [db]);

  const PublicProfile = useMemo(
    () =>
      profilesLoaded
        ? db
            .getRooms('profiles')
            .find((room) => room.publicAccess === 'read')
            ?.getDocuments()
        : null,
    [db, profilesLoaded]
  );
  const [publicProfile, setPublicProfile] = useState(
    PublicProfile?.get('default')
  );
  PublicProfile?.onChange(() =>
    setPublicProfile(PublicProfile?.getAllToArray()[0])
  );

  const PrivateProfile = useMemo(
    () =>
      profilesLoaded
        ? db
            .getRooms('profiles')
            .find((room) => room.publicAccess === 'private')
            ?.getDocuments()
        : null,
    [db, profilesLoaded]
  );

  const [privateProfile, setPrivateProfile] = useState(
    PrivateProfile?.get('default')
  );
  PrivateProfile?.onChange(() =>
    setPrivateProfile(PrivateProfile?.getAllToArray()[0])
  );

  useEffect(() => {
    const updatedUser = { ...user };
    let updated = false;
    for (const profile of [publicProfile, privateProfile]) {
      if (profile) {
        if (profile?.firstName) {
          updatedUser.firstName = profile?.firstName;
          updated = true;
        }
        if (profile?.lastName) {
          updatedUser.lastName = profile?.lastName;
          updated = true;
        }
        if (profile?.avatarUrl) {
          updatedUser.avatar = profile?.avatarUrl;
          updated = true;
        }
      }
    }
    if (updated) setUser(updatedUser);
  }, [publicProfile, privateProfile, user]);
  // console.log(PublicProfile?.getAll(), {
  //   profilesLoaded,
  //   publicProfile,
  //   PublicProfile,
  //   privateProfile,
  //   PrivateProfile,
  //   user,
  // });
  return user;
};
