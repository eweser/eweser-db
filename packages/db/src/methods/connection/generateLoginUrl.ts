import type { LoginQueryOptions, LoginQueryParams } from '@eweser/shared';
import { loginOptionsToQueryParams } from '@eweser/shared';
import type { Database } from '../..';

export const generateLoginUrl =
  (db: Database) =>
  /**
   *
   * @param redirect default uses window.location
   * @param appDomain default uses window.location.hostname
   * @param collections default 'all', which collections your app would like to have write access to
   * @returns a string you can use to redirect the user to the auth server's login page
   */
  (options: Partial<LoginQueryOptions> & { name: string }): string => {
    const url = new URL(db.authServer);

    const params: LoginQueryParams = loginOptionsToQueryParams({
      redirect: options?.redirect || window.location.href,
      domain: options?.domain || window.location.host,
      collections: options?.collections ?? ['all'],
      name: options.name,
    });
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    return url.toString();
  };
