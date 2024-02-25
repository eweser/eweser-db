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
  /** will be all rooms */
  const rooms = await getRoomsFromAccessGrant(authServerAccessGrant);
  const validParams = validateLoginQueryOptions(searchParams);
  const { domain, name } = validParams ?? {};

  return (
    <div className="flex flex-col lg:flex-row flex-1" suppressHydrationWarning>
      <div className="flex flex-col flex-shrink-2 p-10 lg:w-1/2 justify-center items-center bg-primary order-2 lg:order-1">
        <LandingPageHero />
      </div>
      <div className="p-8 flex items-center flex-1 justify-center lg:w-1/2 order-1 lg:order-2">
        <div className="flex flex-col space-y-4">
          <H1>Grant Permissions</H1>
          <Large>{`${name} at ${domain}`}</Large>
          <Small>
            is requesting permission to access these folders in your database
          </Small>

          {validParams && <PermissionForm {...validParams} rooms={rooms} />}
        </div>
      </div>
    </div>
  );
}
