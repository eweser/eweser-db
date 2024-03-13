'use client';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';

import { useCallback, useState } from 'react';
import type { Room } from '../../../model/rooms/schema';
import { COLLECTION_KEYS, type LoginQueryOptions } from '@eweser/shared';
import { submitPermissionsChange } from '../../../app/access-grant/permission/actions';
import { Button } from '../library/button';
import Small from '../library/typography-small';
import Muted from '../library/typography-muted';
import H3 from '../library/typography-h3';
import { Input } from '../library/input';
import { PermissionFormAccordion } from './permission-form-accordion';
import { clearLocalStorageLoginQuery } from '../../utils/local-storage';

const isRequestingAll = (collections: LoginQueryOptions['collections']) =>
  collections.includes('all');

export type PermissionFormProps = LoginQueryOptions & {
  userId: string;
  rooms: Room[];
};

export default function PermissionForm(props: PermissionFormProps) {
  const { redirect, domain, collections, userId, rooms } = props;
  const [requestingAll, setRequestingAll] = useState<boolean>(
    isRequestingAll(collections)
  );
  const [selectedCollections, setSelectedCollections] = useState<
    LoginQueryOptions['collections']
  >(isRequestingAll(collections) ? ['all'] : collections);

  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [keepAliveDays, setKeepAliveDays] = useState<number>(1);

  const collectionKeys = Array.from(
    new Set(rooms.map((room) => room.collectionKey).concat(COLLECTION_KEYS)) // get the hardcoded ones and ones listed in the db
  );

  const handleSubmit = useCallback(async () => {
    // if the user was redirected to the permissions page, the loginQueryOptions will be set in the localStorage. Clear them so they don't get sent back to this page again on a normal login that isn't from third party app permissions request
    clearLocalStorageLoginQuery();

    const redirectUrl = await submitPermissionsChange(
      {
        domain,
        userId,
        roomIds: selectedRoomIds ?? [],
        collections: selectedCollections ?? [],
        keepAliveDays,
      },
      redirect
    );
    window.location.href = redirectUrl;
  }, [
    domain,
    redirect,
    selectedCollections,
    selectedRoomIds,
    userId,
    keepAliveDays,
  ]);

  const handleDeny = () => {
    window.location.href = `${redirect}?error=denied`;
  };

  return (
    <div>
      <PermissionFormAccordion
        {...props}
        collectionKeys={collectionKeys}
        requestingAll={requestingAll}
        setRequestingAll={setRequestingAll}
        selectedCollections={selectedCollections}
        setSelectedCollections={setSelectedCollections}
        selectedRoomIds={selectedRoomIds}
        setSelectedRoomIds={setSelectedRoomIds}
      />
      <div className="flex justify-end pb-4 items-center space-x-4">
        <label htmlFor="keep-alive-days">Cancel grant if inactive for</label>
        <Input
          id="keep-alive-days"
          type="number"
          value={keepAliveDays}
          className="w-16"
          onChange={(e) => setKeepAliveDays(parseInt(e.target.value, 10))}
        />
        <Muted className="inline">day(s)</Muted>
      </div>

      <div className="border border-red-500 dark:border-red-300 rounded p-6 space-y-4">
        <div className="flex items-baseline text-red-500 dark:text-red-300">
          <ExclamationTriangleIcon />
          <H3 className="ml-2">Do you trust this app?</H3>
        </div>
        <p>
          <Small>
            This app will have full read and write access to the folders
            you&apos;ve checked above.
          </Small>
        </p>
        <p>
          <Small>
            {`When you click 'Approve' you will be redirected back to the app's page. Make sure this redirect URL looks correct: `}{' '}
            <p className="underline inline">{redirect.split('?')[0]}</p>
          </Small>
        </p>
        <div className="flex justify-end space-x-4">
          <Button variant="outline" onClick={handleDeny}>
            Deny
          </Button>
          <Button onClick={handleSubmit}>Approve</Button>
        </div>
      </div>
      <div className="space-y-6 mt-10">
        <p>
          <Muted>
            * Checking &quot;All folders&quot; will also give access to any
            future created folders in any collection
          </Muted>
        </p>
        <p>
          <Muted>
            ** Checking &quot;All Collection&quot; will also give access to any
            future created folders in that collection
          </Muted>
        </p>
      </div>
    </div>
  );
}
