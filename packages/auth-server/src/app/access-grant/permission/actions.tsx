'use server';

import type { ThirdPartyAppPermissions } from '../../../modules/account/access-grant/create-third-party-app-permissions';
import { createOrUpdateThirdPartyAppPermissions } from '../../../modules/account/access-grant/create-third-party-app-permissions';

export async function submitPermissionsChange(
  permissions: ThirdPartyAppPermissions,
  redirect: string
) {
  const token = await createOrUpdateThirdPartyAppPermissions(permissions);
  const redirectUrl = new URL(redirect);
  redirectUrl.searchParams.set('token', token);
  // console.log({ token, redirectUrl: redirectUrl.toString() });
  return redirectUrl.toString();
}
