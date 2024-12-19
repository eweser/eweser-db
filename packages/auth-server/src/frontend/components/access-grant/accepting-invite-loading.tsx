'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import H2 from '../library/typography-h2';
import { Icons } from '../library/icons';
import type { AcceptRoomInviteParams } from '../../../modules/account/access-grant/accept-room-invite';
import { acceptRoomInvite } from '../../../modules/account/access-grant/accept-room-invite';
import {
  notAdminOfRoomError,
  roomNotFoundError,
} from '../../../modules/account/access-grant/roomNotFoundError';

export function AcceptingInviteLoading({
  acceptRoomInviteParams,
  redirect,
  redirectQueries,
  domain,
  initialError,
}: {
  acceptRoomInviteParams: AcceptRoomInviteParams | undefined;
  redirect?: string;
  redirectQueries?: Record<string, string>;
  domain?: string;
  initialError: string;
}) {
  const [error, setError] = useState(initialError);
  const router = useRouter();
  useEffect(() => {
    async function acceptInvite() {
      if (acceptRoomInviteParams && redirect && domain) {
        try {
          const result = await acceptRoomInvite(acceptRoomInviteParams);
          if (!result.ySweetUrl) {
            throw new Error('Failed to accept room invite');
          }
          const successUrl = new URL(
            redirect,
            `http${
              process.env.NODE_ENV === 'development' ? '' : 's'
            }://${domain}`
          );
          if (redirectQueries) {
            Object.keys(redirectQueries).forEach((key) => {
              successUrl.searchParams.set(key, redirectQueries[key]);
            });
          }
          return router.replace(successUrl.toString());
        } catch (error: any) {
          const message =
            error.message === roomNotFoundError
              ? roomNotFoundError
              : error.message === notAdminOfRoomError
              ? notAdminOfRoomError
              : 'Failed to update room';
          setError(message);
        }
      }
    }
    acceptInvite();
  }, [acceptRoomInviteParams, domain, redirect, redirectQueries, router]);

  return (
    <div>
      {!error ? (
        <>
          <H2>Accepting invite</H2>
          <h4 className="pt-6 text-primary">
            You will be redirected shortly...
          </h4>
          <Icons.spinner className="animate-spin m-auto mt-10 text-gray-500 w-20 h-20" />
        </>
      ) : (
        <>
          <H2>Error accepting invite</H2>
          <h4 className="pt-6 text-red-500">{error}</h4>
        </>
      )}
    </div>
  );
}
