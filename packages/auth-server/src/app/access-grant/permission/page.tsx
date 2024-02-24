import type { Metadata } from 'next';
import Image from 'next/image';

import { siteConfig } from '../../../frontend/config/site';
import type { LoginQueryParams } from '@eweser/shared';
import { protectPage } from '../../../modules/account/protect-page';
import { validateLoginQueryOptions } from '../../../shared/utils';

export const metadata: Metadata = {
  title: siteConfig.pageName('Login'),
};

export default async function GrantPermissionsPage({
  searchParams,
}: {
  searchParams: LoginQueryParams;
}) {
  const user = await protectPage();
  const validParams = validateLoginQueryOptions(searchParams);
  const { redirect, domain, collections } = validParams ?? {};
  // eslint-disable-next-line no-console
  console.log({ user, redirect, domain, collections });
  return (
    <div className="flex flex-col lg:flex-row flex-1" suppressHydrationWarning>
      <div className="flex flex-col flex-shrink-2 p-10 lg:w-1/2 justify-center items-center bg-primary order-2 lg:order-1">
        <div className="relative flex flex-1 w-full min-h-40 max-w-sm">
          <Image
            src="/eweser-db-logo.png"
            alt="eweser-db-logo"
            fill
            className="object-contain"
          />
        </div>

        <p className="text-lg text-white">
          A user-owned database. Just for ewe
        </p>
      </div>
      <div className="p-8 flex items-center flex-1 justify-center  lg:w-1/2 order-1 lg:order-2">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <h1>Grant Permissions</h1>
        </div>
      </div>
    </div>
  );
}
