import type { LoginQueryOptions } from '@eweser/shared';
import { loginOptionsToQueryParams } from '@eweser/shared';
import { validateLoginQueryOptions } from '../../shared/utils';

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
