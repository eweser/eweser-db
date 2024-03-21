import type {
  CreateRoomInviteBody,
  CreateRoomInviteResponse,
  LoginQueryOptions,
  RoomAccessType,
} from '@eweser/shared';
import { loginOptionsToQueryParams } from '@eweser/shared';
import { Database } from '../..';

export const generateShareRoomLink =
  (db: Database) =>
  async ({
    roomId,
    invitees,
    redirectUrl,
    redirectQueries,
    expiry,
    accessType,
    appName,
    domain,
    collections,
  }: Partial<LoginQueryOptions> & {
    roomId: string;
    invitees?: string[];
    redirectUrl?: string;
    redirectQueries?: Record<string, string>;
    expiry?: string;
    accessType: RoomAccessType;
    appName: string;
  }) => {
    const body: CreateRoomInviteBody = {
      roomId,
      invitees: invitees || [],
      redirectQueries,
      expiry:
        expiry || new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      accessType,
      ...loginOptionsToQueryParams({
        name: appName,
        domain: domain || window.location.host,
        collections: collections ?? ['all'],
        redirect: redirectUrl || window.location.href.split('?')[0],
      }),
    };
    const { error, data } = await db.serverFetch<CreateRoomInviteResponse>(
      '/access-grant/create-room-invite',
      {
        body,
        method: 'POST',
      }
    );
    if (error) {
      db.error('Error creating room invite', error);
      return JSON.stringify(error);
    }
    if (!data?.link) {
      return 'Error creating room invite';
    }

    return data.link;
  };
