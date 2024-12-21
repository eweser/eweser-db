import type { Metadata } from 'next';

import { siteConfig } from '../../../frontend/config/site';
import type { LoginQueryParams } from '@eweser/shared';
import { protectPage } from '../../../modules/account/protect-page';
import { validateLoginQueryOptions } from '../../../shared/utils';
import H1 from '../../../frontend/components/library/typography-h1';
import Large from '../../../frontend/components/library/typography-large';
import LandingPageHero from '../../../frontend/components/landing-page-hero';
import Small from '../../../frontend/components/library/typography-small';
import { getRoomsFromAccessGrant } from '../../../model/rooms/calls';
import { createNewUserRoomsAndAuthServerAccess } from '../../../modules/account/create-new-user-rooms-and-auth-server-access';
import PermissionForm from '../../../frontend/components/access-grant/permission-form';
import {
  createAccessGrantId,
  getAccessGrantById,
} from '../../../model/access_grants';
import { PermissionsUnchangedRedirect } from '../../../frontend/components/access-grant/permissions-unchanged-redirect';
import { createTokenFromAccessGrant } from '../../../modules/account/access-grant/create-token-from-grant';

export const metadata: Metadata = {
  title: siteConfig.pageName('Login'),
};

export default async function GrantPermissionsPage({
  searchParams,
}: {
  searchParams: LoginQueryParams;
}) {
  const user = await protectPage();
  const { authServerAccessGrant } = await createNewUserRoomsAndAuthServerAccess(
    user.id
  );
  /** will be all rooms. Use this to list out all the options */
  const rooms = await getRoomsFromAccessGrant(authServerAccessGrant);
  const validParams = validateLoginQueryOptions(searchParams);
  const { domain, name, collections, redirect } = validParams ?? {};
  let redirectUrl: URL | null = null;
  if (domain && redirect) {
    // check for existing grant. Is is the same permissions list as requested? If so redirect to the redirect url with the token

    try {
      const existingAccessGrant = await getAccessGrantById(
        createAccessGrantId(user.id, domain ?? '')
      );

      if (existingAccessGrant) {
        if (
          collections?.every((collection) =>
            existingAccessGrant.collections.includes(collection)
          )
        ) {
          // redirect to the redirect url with the token
          const token = await createTokenFromAccessGrant(
            existingAccessGrant,
            domain
          );
          redirectUrl = new URL(redirect);
          redirectUrl.searchParams.set('token', token);
        }
      }
    } catch (error) {
      // ignore
    }
  }
  return (
    <div className="flex flex-col lg:flex-row flex-1" suppressHydrationWarning>
      <div className="flex flex-col flex-shrink-2 p-10 lg:w-1/2 justify-center items-center bg-primary order-2 lg:order-1">
        <LandingPageHero />
      </div>
      <div className="p-8 flex items-center flex-1 justify-center lg:w-1/2 order-1 lg:order-2">
        {redirectUrl ? (
          <PermissionsUnchangedRedirect redirectUrl={redirectUrl.toString()} />
        ) : (
          <div className="flex flex-col space-y-4">
            <H1>Grant Permissions</H1>
            <Large>{`${name} at ${domain}`}</Large>
            <Small>
              is requesting permission to access these folders in your database
            </Small>

            {validParams ? (
              <PermissionForm userId={user.id} {...validParams} rooms={rooms} />
            ) : (
              <div className="border border-red-400 p-4">
                <p>Invalid request</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
