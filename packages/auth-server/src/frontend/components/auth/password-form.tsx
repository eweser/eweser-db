import type { ChangeEvent } from 'react';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '../library/button';
import { Input } from '../library/input';
import { Label } from '../library/label';
import { debounce } from '../../utils/debounce';
import { checkEmailExists } from '../../../app/actions';

export default function PasswordForm({
  isSignup,
  setIsSignup,
  setIsLoading,
  isCheckEmail,
  setIsCheckEmail,
}: {
  isSignup: boolean;
  setIsSignup: (isSignup: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  isCheckEmail: boolean;
  setIsCheckEmail: (checkEmail: boolean) => void;
}) {
  const { pending } = useFormStatus(); // only works when it is INSIDE a <form>
  useEffect(() => {
    setIsLoading(pending);
  }, [pending, setIsLoading]);
  const emailInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, []);
  const [email, setEmail] = useState<string>('');

  const searchForUserEmail = useCallback(
    async (email: string) => {
      if (email.length > 0) {
        const formData = new FormData();
        formData.append('email', email);
        const response = await checkEmailExists(formData);
        setIsSignup(!response.userExists);
        setIsCheckEmail(false);
        setIsLoading(false);
      }
    },
    [setIsCheckEmail, setIsLoading, setIsSignup]
  );

  const emailSearchDebounced = useMemo(
    () => debounce(searchForUserEmail, 500),
    [searchForUserEmail]
  );

  useEffect(() => {
    return () => {
      emailSearchDebounced.cancel();
    };
  }, [emailSearchDebounced]);

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    emailSearchDebounced(e.target.value);
  };

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
        onChange={onChange}
        value={email}
        ref={emailInputRef}
      />
      {!isCheckEmail && (
        <>
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
        </>
      )}
      <Button type="submit" disabled={isLoading}>
        {isCheckEmail ? 'Continue with Email' : isSignup ? 'Sign Up' : 'Log In'}
      </Button>
    </>
  );
}
