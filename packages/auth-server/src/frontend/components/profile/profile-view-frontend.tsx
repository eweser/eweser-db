'use client';
import { DatabaseProvider, useDatabase } from '@/frontend/eweser-db-provider';
import type { Room } from '@/model/rooms/schema';
import type { Profile } from '@eweser/db';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '../library/card';
import { Skeleton } from '../library/skeleton';

import H2 from '../library/typography-h2';
import { Label } from '../library/label';
import { Input } from '../library/input';
import { AUTH_SERVER_DOMAIN } from '@/shared/constants';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../library/select';
import { Badge } from '../library/badge';

export interface ProfileViewProps {
  publicProfileRoom: Room;
  privateProfileRoom: Room;
  email: string;
  userCount: number;
}

function ProfileViewInner({
  publicProfileRoom,
  privateProfileRoom,
  email,
  userCount,
}: ProfileViewProps) {
  const { db } = useDatabase();
  const PrivateProfile = db.getDocuments(
    db.collections.profiles[privateProfileRoom.id]
  );
  const PublicProfile = db.getDocuments(
    db.collections.profiles[publicProfileRoom.id]
  );

  const [privateProfile, setPrivateProfile] = useState<Profile | undefined>(
    PrivateProfile.get('default')
  );
  const [publicProfile, setPublicProfile] = useState<Profile | undefined>(
    PublicProfile.get('default')
  );

  PrivateProfile.onChange(() => {
    setPrivateProfile(PrivateProfile.get('default'));
  });
  PublicProfile.onChange(() => {
    setPublicProfile(PublicProfile.get('default'));
  });

  // set up the initial document if it doesn't exist
  useEffect(() => {
    if (!privateProfile) {
      const existing = PrivateProfile.get('default');
      if (existing) {
        setPrivateProfile(existing);
        return;
      }
      PrivateProfile.new({ firstName: '' }, 'default');
    }
  }, [privateProfile, PrivateProfile, privateProfileRoom.id]);
  // set up the initial document if it doesn't exist
  useEffect(() => {
    if (!publicProfile) {
      const newName = `${AUTH_SERVER_DOMAIN} user #${userCount}`;
      const existing = PublicProfile.get('default');
      if (existing) {
        if (!existing.firstName && !privateProfile?.firstName) {
          PublicProfile.set({
            ...existing,
            firstName: newName,
          });
        }
        setPublicProfile({
          ...existing,
          firstName: newName,
        });
        return;
      } else {
        PublicProfile.new({ firstName: newName }, 'default');
      }
    }
  }, [
    publicProfile,
    PublicProfile,
    publicProfileRoom.id,
    userCount,
    privateProfile?.firstName,
  ]);

  const firstNameIsPublic = !!publicProfile?.firstName;

  const firstName = firstNameIsPublic
    ? publicProfile?.firstName
    : privateProfile?.firstName;

  const lastNameIsPublic = !!publicProfile?.lastName;

  const lastName = lastNameIsPublic
    ? publicProfile?.lastName
    : privateProfile?.lastName;

  return (
    <div className="p-10 justify-center flex w-full">
      <Card className="flex-1 max-w-md">
        <CardHeader>
          <H2>Profile</H2>
          <CardDescription>
            Edit your profile info and set visibility
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Label className="text-muted-foreground" htmlFor="email">
            Email
          </Label>
          <div className="flex justify-between">
            <Input disabled readOnly value={email} className="w-fit" />
            <Badge variant="secondary" className="ml-2">
              Private
            </Badge>
          </div>
          <div>
            <Label className="text-muted-foreground" htmlFor="first-name">
              First Name
            </Label>
            <div className="flex">
              <Input
                className="flex-grow-2"
                id="first-name"
                placeholder="First Name"
                value={firstName}
                onChange={({ target }) => {
                  const firstName = target.value;
                  if (!publicProfile?._id || !privateProfile?._id) {
                    return;
                  }
                  if (firstNameIsPublic) {
                    PublicProfile.set({ ...publicProfile, firstName });
                    PrivateProfile.set({ ...privateProfile, firstName: '' });
                  } else {
                    PrivateProfile.set({ ...privateProfile, firstName });
                    PublicProfile.set({ ...publicProfile, firstName: '' });
                  }
                }}
              />
              <div className="pl-2">
                <Select
                  onValueChange={(value) => {
                    if (!publicProfile?._id || !privateProfile?._id) {
                      return;
                    }
                    const isPublic = value === 'public';
                    // reset the other profile's first name when toggling
                    if (isPublic) {
                      PrivateProfile.set({ ...privateProfile, firstName: '' });
                      PublicProfile.set({ ...publicProfile, firstName });
                    } else if (publicProfile.firstName) {
                      PublicProfile.set({ ...publicProfile, firstName: '' });
                      PrivateProfile.set({ ...privateProfile, firstName });
                    }
                  }}
                >
                  <SelectTrigger id="first-name-visibility">
                    <SelectValue
                      placeholder={firstNameIsPublic ? 'Public' : 'Private'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div>
            <Label className="text-muted-foreground" htmlFor="last-name">
              Last Name
            </Label>
            <div className="flex">
              <Input
                className="flex-grow-2"
                id="last-name"
                placeholder="Last Name"
                value={lastName}
                onChange={({ target }) => {
                  const lastName = target.value;
                  if (!publicProfile?._id || !privateProfile?._id) {
                    return;
                  }
                  if (lastNameIsPublic) {
                    PublicProfile.set({ ...publicProfile, lastName });
                    PrivateProfile.set({ ...privateProfile, lastName: '' });
                  } else {
                    PrivateProfile.set({ ...privateProfile, lastName });
                    PublicProfile.set({ ...publicProfile, lastName: '' });
                  }
                }}
              />
              <div className="pl-2">
                <Select
                  onValueChange={(value) => {
                    if (!publicProfile?._id || !privateProfile?._id) {
                      return;
                    }
                    const isPublic = value === 'public';
                    // reset the other profile's first name when toggling
                    if (isPublic) {
                      PrivateProfile.set({ ...privateProfile, lastName: '' });
                      PublicProfile.set({ ...publicProfile, lastName });
                    } else if (publicProfile.lastName) {
                      PublicProfile.set({ ...publicProfile, lastName: '' });
                      PrivateProfile.set({ ...privateProfile, lastName });
                    }
                  }}
                >
                  <SelectTrigger id="last-name-visibility">
                    <SelectValue
                      placeholder={lastNameIsPublic ? 'Public' : 'Private'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ProfileViewFrontend({
  publicProfileRoom,
  privateProfileRoom,
  ...props
}: ProfileViewProps) {
  return (
    <DatabaseProvider
      initialRooms={[publicProfileRoom, privateProfileRoom]}
      loadingComponent={
        <div className="p-10 space-y-6 self-center">
          <Skeleton className="h-8 w-[250px]" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      }
    >
      <ProfileViewInner
        privateProfileRoom={privateProfileRoom}
        publicProfileRoom={publicProfileRoom}
        {...props}
      />
    </DatabaseProvider>
  );
}

export default dynamic(() => Promise.resolve(ProfileViewFrontend), {
  ssr: false,
});
