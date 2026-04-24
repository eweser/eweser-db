import type { Database } from '@eweser/db';
import { useEffect, useMemo, useState } from 'react';

type UserState = {
  firstName: string;
  lastName: string;
  avatar: string;
};

type AccountBootstrapResponse = {
  user?: {
    image?: string | null;
    name?: string | null;
  };
};

function splitDisplayName(name?: string | null) {
  const trimmed = name?.trim() ?? '';
  if (!trimmed) {
    return { firstName: '', lastName: '' };
  }

  const [firstName = '', ...rest] = trimmed.split(/\s+/);

  return {
    firstName,
    lastName: rest.join(' '),
  };
}

export const useGetUserFromDb = (db: Database, canFetchAccount = false) => {
  const [user, setUser] = useState<UserState>({
    firstName: '',
    lastName: '',
    avatar: '',
  });
  const [accountUser, setAccountUser] = useState<UserState | null>(null);
  const [profilesLoaded, setProfilesLoaded] = useState(false);

  useEffect(() => {
    const handleRoomLoaded = () => {
      if (db.getRooms('profiles').length > 1) {
        const profileRoom = db
          .getRooms('profiles')
          .find((room) => room.publicAccess === 'read');
        if (profileRoom?.ydoc) setProfilesLoaded(true);
      }
    };

    db.on('roomLoaded', handleRoomLoaded);

    return () => {
      db.off('roomLoaded', handleRoomLoaded);
    };
  }, [db]);

  useEffect(() => {
    if (!canFetchAccount) {
      return;
    }

    const controller = new AbortController();

    async function loadAccountUser() {
      try {
        const response = await fetch(
          new URL('/api/account/bootstrap', db.authServer).toString(),
          {
            credentials: 'include',
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as AccountBootstrapResponse;
        const names = splitDisplayName(data.user?.name);

        setAccountUser({
          firstName: names.firstName,
          lastName: names.lastName,
          avatar: data.user?.image ?? '',
        });
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
      }
    }

    void loadAccountUser();

    return () => {
      controller.abort();
    };
  }, [canFetchAccount, db.authServer]);

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

  useEffect(() => {
    if (!PublicProfile) {
      setPublicProfile(undefined);
      return;
    }

    const handlePublicProfileChange = () => {
      setPublicProfile(PublicProfile.getAllToArray()[0]);
    };

    handlePublicProfileChange();
    PublicProfile.onChange(handlePublicProfileChange);

    return () => {
      PublicProfile.documents.unobserve(handlePublicProfileChange);
    };
  }, [PublicProfile]);

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

  useEffect(() => {
    if (!PrivateProfile) {
      setPrivateProfile(undefined);
      return;
    }

    const handlePrivateProfileChange = () => {
      setPrivateProfile(PrivateProfile.getAllToArray()[0]);
    };

    handlePrivateProfileChange();
    PrivateProfile.onChange(handlePrivateProfileChange);

    return () => {
      PrivateProfile.documents.unobserve(handlePrivateProfileChange);
    };
  }, [PrivateProfile]);

  useEffect(() => {
    const nextUser: UserState = {
      firstName: accountUser?.firstName ?? '',
      lastName: accountUser?.lastName ?? '',
      avatar: accountUser?.avatar ?? '',
    };

    for (const profile of [publicProfile, privateProfile]) {
      if (profile) {
        if (profile?.firstName) {
          nextUser.firstName = profile?.firstName;
        }
        if (profile?.lastName) {
          nextUser.lastName = profile?.lastName;
        }
        if (profile?.avatarUrl) {
          nextUser.avatar = profile?.avatarUrl;
        }
      }
    }

    setUser((currentUser) => {
      if (
        currentUser.firstName === nextUser.firstName &&
        currentUser.lastName === nextUser.lastName &&
        currentUser.avatar === nextUser.avatar
      ) {
        return currentUser;
      }

      return nextUser;
    });
  }, [accountUser, publicProfile, privateProfile]);

  return user;
};
