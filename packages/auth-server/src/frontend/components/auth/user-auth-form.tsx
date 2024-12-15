'use client';

import { useState, useEffect } from 'react';
import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '../../../shared/utils';
import { checkEmailExists, login, signup } from '../../../app/actions';
import PasswordForm from './password-form';
import OAuthForm from './oauth-form';
import type { LoginQueryOptions } from '@eweser/shared';
import { setLocalStorageLoginQuery } from '../../utils/local-storage';

type UserAuthFormProps = ComponentPropsWithoutRef<'div'> & {
  className?: string;
  loginQueryOptions: LoginQueryOptions | null;
  isShareInviteRedirect?: boolean;
};

export function UserAuthForm({
  className,
  loginQueryOptions,
  isShareInviteRedirect,
  ...props
}: UserAuthFormProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [isSignup, setIsSignup] = useState<boolean>(true);
  const [isCheckEmail, setIsCheckEmail] = useState<boolean>(true);

  // if LoginQueryOptions are defined, set the redirect info into the localStorage
  // when login/signup is complete, redirect to the permissions page.
  // login/signup is completed on the Home page. Or at least that is the first place we can access the frontend to get the localStorage
  // After submitting the permissions page, clear the localStorage
  useEffect(() => {
    // in useEffect to avoid SSR issues
    if (loginQueryOptions) {
      setLocalStorageLoginQuery(loginQueryOptions);
    }
  }, [loginQueryOptions]);
  return (
    <div className={cn('grid gap-6', className)} {...props}>
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {isSignup ? 'Create an account' : 'Welcome back'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isShareInviteRedirect
            ? 'You have been invited to share data. Please log in or create an account to accept the invite.'
            : isSignup
            ? 'And take control of your data today'
            : 'Log in to provision and manage your data'}
        </p>
      </div>
      <form
        action={isCheckEmail ? checkEmailExists : isSignup ? signup : login}
        className="flex flex-col space-y-2"
      >
        <PasswordForm
          isCheckEmail={isCheckEmail}
          setIsCheckEmail={setIsCheckEmail}
          isSignup={isSignup}
          setIsSignup={setIsSignup}
          setIsLoading={setIsLoading}
        />
      </form>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>
      <OAuthForm isLoading={isLoading} setIsLoading={setIsLoading} />
    </div>
  );
}
