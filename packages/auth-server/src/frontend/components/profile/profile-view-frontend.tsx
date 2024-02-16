'use client';
import type { Room } from '@/model/rooms/schema';
import type { Profile } from '@eweser/db';
import { Database } from '@eweser/db';
import { useEffect, useMemo, useState } from 'react';

function DatabaseProvider({
  publicProfileRoom,
  privateProfileRoom,
  email,
}: {
  publicProfileRoom: Room;
  privateProfileRoom: Room;
  email: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const eweserDB = useMemo(() => {
    if (!publicProfileRoom || !privateProfileRoom) {
      return null;
    }
    return new Database({
      authServer: 'http://localhost:3000',
      logLevel: 0, // log debug events
      initialRooms: [publicProfileRoom, privateProfileRoom].map(
        ({ id, collectionKey, token, ySweetUrl, name }) => ({
          roomId: id,
          collectionKey,
          ySweetToken: token || '',
          ySweetUrl: ySweetUrl || '',
          name,
        })
      ),
    }).on('roomsLoaded', (_rooms) => {
      // could also add check that rooms are correct rooms
      setLoaded(true);
    });
  }, [privateProfileRoom, publicProfileRoom]);

  if (!loaded || !eweserDB) {
    return null;
  }
  return (
    <ProfileViewInner
      db={eweserDB}
      publicProfileRoom={publicProfileRoom}
      privateProfileRoom={privateProfileRoom}
      email={email}
    />
  );
}

function ProfileViewInner({
  db,
  publicProfileRoom,
  privateProfileRoom,
  email,
}: {
  db: Database;
  publicProfileRoom: Room;
  privateProfileRoom: Room;
  email: string;
}) {
  const PrivateProfile = db.getDocuments(
    db.collections.profiles[privateProfileRoom.id]
  );

  const [privateProfile, setPrivateProfile] = useState<Profile | undefined>(
    PrivateProfile.get('default')
  );

  PrivateProfile.onChange(() => {
    setPrivateProfile(PrivateProfile.get('default'));
  });

  useEffect(() => {
    if (!privateProfile) {
      const exists = PrivateProfile.get('default');
      if (exists) {
        setPrivateProfile(exists);
        return;
      }
      PrivateProfile.new(
        {
          firstName: email,
        },
        'default'
      );
    }
  }, [privateProfile, email, PrivateProfile, privateProfileRoom.id]);

  const PublicProfile = db.getDocuments(
    db.collections.profiles[publicProfileRoom.id]
  );

  const [publicProfile, setPublicProfile] = useState<Profile | undefined>(
    PublicProfile.get('default')
  );

  PublicProfile.onChange(() => {
    setPublicProfile(PublicProfile.get('default'));
  });

  useEffect(() => {
    if (!publicProfile) {
      const exists = PublicProfile.get('default');
      if (exists) {
        setPublicProfile(exists);
        return;
      }
      PublicProfile.new(
        {
          firstName: 'EweserDB User',
        },
        'default'
      );
    }
  }, [publicProfile, email, PublicProfile, publicProfileRoom.id]);

  return (
    <div>
      <h1>Public Profile</h1>
      <code>{JSON.stringify(publicProfile, null, 2)}</code>
      <h1>Private Profile</h1>
      <code>{JSON.stringify(privateProfile, null, 2)}</code>
    </div>
  );
}

export default function ProfileViewFrontend({
  publicProfileRoom,
  privateProfileRoom,
  email,
}: {
  publicProfileRoom: Room;
  privateProfileRoom: Room;
  email: string;
}) {
  return (
    <DatabaseProvider
      publicProfileRoom={publicProfileRoom}
      privateProfileRoom={privateProfileRoom}
      email={email}
    />
  );
}
