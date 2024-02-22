'use client';

import * as React from 'react';

import { cn } from '@/shared/utils';
import { login, signup } from '@/app/actions';
import PasswordForm from './password-form';
import OAuthForm from './oauth-form';
import type { LoginQueryOptions } from '@eweser/shared';
import type { ComponentPropsWithoutRef } from 'react';
import { useState } from 'react';

type UserAuthFormProps = ComponentPropsWithoutRef<'div'> &
  Partial<LoginQueryOptions> & {
    className?: string;
  };

// if LoginQueryOptions are defined, then redirect to the access permissions page after login.

export function UserAuthForm({ className, ...props }: UserAuthFormProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [isSignup, setIsSignup] = useState<boolean>(true);

  const toggleSignup = () => setIsSignup((prev) => !prev);

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
