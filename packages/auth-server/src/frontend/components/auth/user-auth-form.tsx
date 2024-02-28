'use client';

import * as React from 'react';

import { cn } from '../../../shared/utils';
import { login, signup } from '../../../app/actions';
import PasswordForm from './password-form';
import OAuthForm from './oauth-form';
import type { LoginQueryOptions } from '@eweser/shared';
import type { ComponentPropsWithoutRef } from 'react';
import { useState } from 'react';
import { setLocalStorageLoginQuery } from '../../utils';

type UserAuthFormProps = ComponentPropsWithoutRef<'div'> & {
  className?: string;
  loginQueryOptions: LoginQueryOptions | null;
};

export function UserAuthForm({
  className,
  loginQueryOptions,
  ...props
}: UserAuthFormProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [isSignup, setIsSignup] = useState<boolean>(true);

  const toggleSignup = () => setIsSignup((prev) => !prev);
  // if LoginQueryOptions are defined, set the redirect info into the localStorage
  // when login/signup is complete, redirect to the permissions page.
  // login/signup is completed on the Home page. Or at least that is the first place we can access the frontend to get the localStorage
  // After submitting the permissions page, clear the localStorage
  if (loginQueryOptions) {
    setLocalStorageLoginQuery(loginQueryOptions);
  }
  return (
    <div className={cn('grid gap-6', className)} {...props}>
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {isSignup ? 'Create an account' : 'Welcome back'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isSignup
            ? 'And take control of your data today'
            : 'Log in to provision and manage your data'}
        </p>
      </div>
      <form
        action={isSignup ? signup : login}
        className="flex flex-col space-y-2"
      >
        <PasswordForm
          isSignup={isSignup}
          toggleSignup={toggleSignup}
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
