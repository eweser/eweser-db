import React from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '../library/button';
import { Input } from '../library/input';
import { Icons } from '../library/icons';
import { Label } from '../library/label';

export default function PasswordForm({
  isSignup,
  toggleSignup,
  setIsLoading,
}: {
  isSignup: boolean;
  toggleSignup: () => void;
  setIsLoading: (loading: boolean) => void;
}) {
  const { pending } = useFormStatus(); // only works when it is INSIDE a <form>
  React.useEffect(() => {
    setIsLoading(pending);
  }, [pending, setIsLoading]);

  const isLoading = pending;
  return (
    <>
      <Label className="sr-only" htmlFor="email">
        Email
      </Label>
      <Input
        id="email"
        placeholder="name@example.com"
        type="email"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect="off"
        disabled={isLoading}
        name="email"
      />
      <Label className="sr-only" htmlFor="password">
        Password
      </Label>
      <Input
        id="password"
        placeholder="Password"
        type="password"
        autoCapitalize="none"
        autoComplete="current-password"
        autoCorrect="off"
        disabled={isLoading}
        name="password"
      />
      <div className="flex w-full justify-between">
        {isSignup ? (
          <>
            <Button type="submit" disabled={isLoading}>
              {isLoading && (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              Sign Up with Email
            </Button>
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                toggleSignup();
              }}
              variant="outline"
              disabled={isLoading}
            >
              Sign In
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                toggleSignup();
              }}
              variant="outline"
              disabled={isLoading}
            >
              Sign Up
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              Sign In with Email
            </Button>
          </>
        )}
      </div>
    </>
  );
}
