import type { Metadata } from 'next';

import { UserAuthForm } from '../frontend/components/auth/user-auth-form';
import { siteConfig } from '../frontend/config/site';
import Link from 'next/link';
import type { LoginQueryParams } from '@eweser/shared';
import { getSessionUser } from '../modules/account/get-session-user';
import { validateLoginQueryOptions } from '../shared/utils';
import { redirect } from 'next/navigation';
import LandingPageHero from '../frontend/components/landing-page-hero';
import { loginOptionsToPermissionPageUrl } from '../frontend/utils/frontend-url-utils';

export const metadata: Metadata = {
  title: siteConfig.pageName('Login'),
};

export default async function AuthenticationPage({
  searchParams,
}: {
  searchParams: LoginQueryParams;
}) {
  const { user } = await getSessionUser();
  const validLoginQueryOptions =
    searchParams && validateLoginQueryOptions(searchParams);

  if (validLoginQueryOptions && user) {
    redirect(loginOptionsToPermissionPageUrl(validLoginQueryOptions));
  }
  return (
    <div className="flex flex-col lg:flex-row flex-1" suppressHydrationWarning>
      <div className="flex flex-col flex-shrink-2 p-10 lg:w-1/2 justify-center items-center bg-primary order-2 lg:order-1">
        <LandingPageHero />
      </div>
      <div className="p-8 flex items-center flex-1 justify-center  lg:w-1/2 order-1 lg:order-2">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <UserAuthForm loginQueryOptions={validLoginQueryOptions} />
          <p className="px-8 text-center text-sm text-muted-foreground">
            By clicking continue, you agree to our{' '}
            <Link
              href="/statement/terms-of-service"
              className="underline underline-offset-4 hover:text-primary"
            >
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link
              href="/statement/privacy"
              className="underline underline-offset-4 hover:text-primary"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
