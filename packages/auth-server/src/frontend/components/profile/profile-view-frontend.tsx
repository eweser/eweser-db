'use client';
import { DatabaseProvider, useDatabase } from '@/frontend/eweser-db-provider';
import type { Room } from '@/model/rooms/schema';
import type { Profile } from '@eweser/db';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

function ProfileViewInner({
  publicProfileRoom,
  privateProfileRoom,
  email,
}: {
  publicProfileRoom: Room;
  privateProfileRoom: Room;
  email: string;
}) {
  const { db } = useDatabase();
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

export function ProfileViewFrontend({
  publicProfileRoom,
  privateProfileRoom,
  email,
}: {
  publicProfileRoom: Room;
  privateProfileRoom: Room;
  email: string;
}) {
  return (
    <DatabaseProvider initialRooms={[publicProfileRoom, privateProfileRoom]}>
      <ProfileViewInner
        privateProfileRoom={privateProfileRoom}
        publicProfileRoom={publicProfileRoom}
        email={email}
      />
    </DatabaseProvider>
  );
}

export default dynamic(() => Promise.resolve(ProfileViewFrontend), {
  ssr: false,
});
