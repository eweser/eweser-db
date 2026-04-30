import type { Profile } from '@eweser/db';
import type { ServerRoom } from '@eweser/shared';
import { useEffect, useState } from 'react';
import { authServerUrl } from '../lib/config';
import { DatabaseProvider, useDatabase } from '../lib/db-provider';
import { Badge, Card, Input, Label } from './ui';

function ProfileEditorInner({
  email,
  privateProfileRoom,
  publicProfileRoom,
  userCount,
}: {
  email: string;
  privateProfileRoom: ServerRoom;
  publicProfileRoom: ServerRoom;
  userCount: number;
}) {
  const { db } = useDatabase();
  const privateRoom = db.collections.profiles[privateProfileRoom.id];
  const publicRoom = db.collections.profiles[publicProfileRoom.id];
  const privateDocuments = privateRoom ? db.getDocuments(privateRoom) : null;
  const publicDocuments = publicRoom ? db.getDocuments(publicRoom) : null;
  const [privateProfile, setPrivateProfile] = useState<Profile | undefined>();
  const [publicProfile, setPublicProfile] = useState<Profile | undefined>();

  useEffect(() => {
    if (!privateDocuments || !publicDocuments) {
      return;
    }

    const privateDocs = privateDocuments;
    const publicDocs = publicDocuments;

    function syncPrivate() {
      setPrivateProfile(privateDocs.get('default'));
    }

    function syncPublic() {
      setPublicProfile(publicDocs.get('default'));
    }

    syncPrivate();
    syncPublic();
    privateDocs.documents.observe(syncPrivate);
    publicDocs.documents.observe(syncPublic);

    return () => {
      privateDocs.documents.unobserve(syncPrivate);
      publicDocs.documents.unobserve(syncPublic);
    };
  }, [privateDocuments, publicDocuments]);

  useEffect(() => {
    if (!privateDocuments) {
      return;
    }

    if (!privateDocuments.get('default')) {
      privateDocuments.new({ firstName: '', lastName: '' }, 'default');
    }
  }, [privateDocuments]);

  useEffect(() => {
    if (!privateDocuments || !publicDocuments) {
      return;
    }

    const defaultName = `${new URL(authServerUrl).host} user #${userCount}`;
    const existing = publicDocuments.get('default');

    if (!existing) {
      publicDocuments.new({ firstName: defaultName, lastName: '' }, 'default');
      return;
    }

    if (!existing.firstName && !privateProfile?.firstName) {
      publicDocuments.set({ ...existing, firstName: defaultName });
    }
  }, [privateDocuments, privateProfile?.firstName, publicDocuments, userCount]);

  const firstNameIsPublic = Boolean(publicProfile?.firstName);
  const lastNameIsPublic = Boolean(publicProfile?.lastName);
  const firstName = firstNameIsPublic
    ? (publicProfile?.firstName ?? '')
    : (privateProfile?.firstName ?? '');
  const lastName = lastNameIsPublic
    ? (publicProfile?.lastName ?? '')
    : (privateProfile?.lastName ?? '');

  function updateField(field: 'firstName' | 'lastName', value: string) {
    if (!privateDocuments || !publicDocuments) {
      return;
    }

    const currentPrivate = privateDocuments.get('default');
    const currentPublic = publicDocuments.get('default');
    if (!currentPrivate || !currentPublic) {
      return;
    }

    const isPublic =
      field === 'firstName' ? firstNameIsPublic : lastNameIsPublic;

    if (isPublic) {
      publicDocuments.set({ ...currentPublic, [field]: value });
      privateDocuments.set({ ...currentPrivate, [field]: '' });
      return;
    }

    privateDocuments.set({ ...currentPrivate, [field]: value });
    publicDocuments.set({ ...currentPublic, [field]: '' });
  }

  function updateVisibility(
    field: 'firstName' | 'lastName',
    visibility: 'public' | 'private'
  ) {
    if (!privateDocuments || !publicDocuments) {
      return;
    }

    const currentPrivate = privateDocuments.get('default');
    const currentPublic = publicDocuments.get('default');
    if (!currentPrivate || !currentPublic) {
      return;
    }

    const currentValue = field === 'firstName' ? firstName : lastName;

    if (visibility === 'public') {
      privateDocuments.set({ ...currentPrivate, [field]: '' });
      publicDocuments.set({ ...currentPublic, [field]: currentValue });
      return;
    }

    publicDocuments.set({ ...currentPublic, [field]: '' });
    privateDocuments.set({ ...currentPrivate, [field]: currentValue });
  }

  if (!privateDocuments || !publicDocuments) {
    return null;
  }

  return (
    <Card className="mx-auto w-full max-w-2xl p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Account</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Edit your profile details and choose which values are public.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <Label htmlFor="email">Email</Label>
          <div className="mt-2 flex items-center gap-3">
            <Input id="email" readOnly value={email} />
            <Badge>Private</Badge>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              className="mt-2"
              onChange={(event) => updateField('firstName', event.target.value)}
              value={firstName}
            />
            <select
              aria-label="First name visibility"
              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
              onChange={(event) =>
                updateVisibility(
                  'firstName',
                  event.target.value === 'public' ? 'public' : 'private'
                )
              }
              value={firstNameIsPublic ? 'public' : 'private'}
            >
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
          </div>

          <div>
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              className="mt-2"
              onChange={(event) => updateField('lastName', event.target.value)}
              value={lastName}
            />
            <select
              aria-label="Last name visibility"
              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
              onChange={(event) =>
                updateVisibility(
                  'lastName',
                  event.target.value === 'public' ? 'public' : 'private'
                )
              }
              value={lastNameIsPublic ? 'public' : 'private'}
            >
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function ProfileEditor({
  email,
  profileRooms,
  userCount,
}: {
  email: string;
  profileRooms: ServerRoom[];
  userCount: number;
}) {
  const publicProfileRoom =
    profileRooms.find((room) => room.name === 'Public Profile') ??
    profileRooms[0];
  const privateProfileRoom =
    profileRooms.find((room) => room.name === 'Private Profile') ??
    profileRooms[1];

  if (!publicProfileRoom || !privateProfileRoom) {
    return null;
  }

  return (
    <DatabaseProvider
      initialRooms={[publicProfileRoom, privateProfileRoom]}
      loadingComponent={
        <div className="mx-auto max-w-lg py-12 text-center text-sm text-muted-foreground">
          Loading profile rooms...
        </div>
      }
    >
      <ProfileEditorInner
        email={email}
        privateProfileRoom={privateProfileRoom}
        publicProfileRoom={publicProfileRoom}
        userCount={userCount}
      />
    </DatabaseProvider>
  );
}
