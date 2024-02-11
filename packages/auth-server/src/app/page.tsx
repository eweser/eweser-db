import { Metadata } from 'next';
import Image from 'next/image';

import { UserAuthForm } from '@/components/auth/user-auth-form';
import { siteConfig } from '@/config/site';
import Link from 'next/link';

export const metadata: Metadata = {
  title: siteConfig.pageName('Login'),
};

export default function AuthenticationPage() {
  return (
    <div className="flex flex-col lg:flex-row flex-1" suppressHydrationWarning>
      <div className="flex flex-col flex-shrink-2 p-10 lg:w-1/2 justify-center items-center bg-primary order-2 lg:order-1">
        <div className="relative flex flex-1 w-full min-h-40 max-w-sm">
          <Image
            src="/EweserDB logo.png"
            alt="EweserDB logo"
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
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Create an account
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your email below to create your account
            </p>
          </div>
          <UserAuthForm />
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
