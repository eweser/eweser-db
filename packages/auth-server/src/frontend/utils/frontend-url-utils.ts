import {
  loginOptionsToQueryParams,
  type LoginQueryOptions,
} from '@eweser/shared';
import { AUTH_SERVER_URL } from '../../shared/constants';

export function loginOptionsToPermissionPageUrl(
  loginQueryOptions: LoginQueryOptions
) {
  const redirectUrl = new URL(AUTH_SERVER_URL + '/access-grant/permission');
  const queryParams = loginOptionsToQueryParams(loginQueryOptions);
  Object.entries(queryParams).forEach(([key, value]) => {
    redirectUrl.searchParams.append(key, value);
  });
  return redirectUrl.toString();
}
