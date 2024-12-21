import type {
  AcceptRoomInviteQueries,
  CreateRoomInviteBody,
} from '@eweser/shared';

import jwt from 'jsonwebtoken';
import { SERVER_SECRET } from '../../../shared/server-constants';
import { getSessionUser } from '../../../modules/account/get-session-user';
import { redirect } from 'next/navigation';
import { AUTH_SERVER_DOMAIN } from '../../../shared/constants';
import type { AcceptRoomInviteParams } from '../../../modules/account/access-grant/accept-room-invite';

import LandingPageHero from '../../../frontend/components/landing-page-hero';
import { AcceptingInviteLoading } from '../../../frontend/components/access-grant/accepting-invite-loading';

export default async function AcceptRoomInvitePage({
  searchParams,
}: {
  searchParams: Promise<AcceptRoomInviteQueries>;
}) {
  let error = '';
  let options: CreateRoomInviteBody | undefined;
  let acceptRoomInviteParams: AcceptRoomInviteParams | undefined;

  const token = (await searchParams)?.token;
  if (!token) {
    error = 'No token provided';
  } else {
    options = jwt.verify(token, SERVER_SECRET) as CreateRoomInviteBody;
  }
  const { error: sessionError, user } = await getSessionUser();
  if (sessionError || !user) {
    const loginUrl = new URL(
      '/',
      `http${
        process.env.NODE_ENV === 'development' ? '' : 's'
      }://${AUTH_SERVER_DOMAIN}`
    );
    loginUrl.searchParams.set('redirect', '/accept-room-invite?token=' + token);

    return redirect(loginUrl.toString());
  }
  if (!options) {
    error = 'Invalid token';
  } else {
    const { inviterId, invitees, roomId, accessType, expiry } = options;
    if (!inviterId || !roomId || !accessType) {
      error = 'Invalid invite';
    } else if (inviterId === user.id) {
      error = 'You cannot invite yourself';
    } else if (invitees.length > 0 && !invitees.includes(user.id)) {
      // no invitees would be an 'invite anyone' link. But if specified, should match.
      error = 'You are not invited to this room';
    } else if (expiry && new Date(expiry) < new Date()) {
      error = 'Invite has expired';
    } else {
      acceptRoomInviteParams = {
        roomId,
        inviterId,
        accessType,
        user,
      };
    }
  }
  return (
    <div className="flex flex-col lg:flex-row flex-1" suppressHydrationWarning>
      <div className="flex flex-col flex-shrink-2 p-10 lg:w-1/2 justify-center items-center bg-primary order-2 lg:order-1">
        <LandingPageHero />
      </div>
      <div className="p-8 flex items-center flex-1 justify-center lg:w-1/2 order-1 lg:order-2">
        <AcceptingInviteLoading
          acceptRoomInviteParams={acceptRoomInviteParams}
          {...options}
          initialError={error}
        />
      </div>
    </div>
  );
}
