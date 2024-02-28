import {
  loginOptionsToQueryParams,
  type LoginQueryOptions,
} from '@eweser/shared';
import { AUTH_SERVER_URL } from '../shared/constants';
import { validateLoginQueryOptions } from '../shared/utils';

export function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

const LOGIN_QUERY_KEY = 'loginquery';
export function setLocalStorageLoginQuery(query: LoginQueryOptions) {
  localStorage.setItem(
    LOGIN_QUERY_KEY,
    JSON.stringify(loginOptionsToQueryParams(query))
  );
}
export function getLocalStorageLoginQuery(): LoginQueryOptions | null {
  const queryParamsString = localStorage.getItem(LOGIN_QUERY_KEY);
  const params = queryParamsString ? JSON.parse(queryParamsString) : null;
  return validateLoginQueryOptions(params);
}
export function clearLocalStorageLoginQuery() {
  localStorage.removeItem(LOGIN_QUERY_KEY);
}

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
