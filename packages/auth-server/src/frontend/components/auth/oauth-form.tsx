import { Button } from '../library/button';
import { Icons } from '../library/icons';
import { useOauthLogin } from '@/modules/account/oauth/hooks/use-oauth-login';

export default function OAuthForm({
  isLoading,
  setIsLoading,
}: {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}) {
  const { handleOauthLogin } = useOauthLogin({ setIsLoading });

  return (
    <>
      <Button
        onClick={() => handleOauthLogin('google')}
        variant="outline"
        type="button"
        disabled={isLoading}
      >
        {isLoading ? (
          <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Icons.google className="mr-2 h-4 w-4" />
        )}{' '}
        Google
      </Button>
      <Button
        onClick={() => handleOauthLogin('github')}
        variant="outline"
        type="button"
        disabled={isLoading}
      >
        {isLoading ? (
          <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Icons.gitHub className="mr-2 h-4 w-4" />
        )}{' '}
        GitHub
      </Button>
    </>
  );
}
