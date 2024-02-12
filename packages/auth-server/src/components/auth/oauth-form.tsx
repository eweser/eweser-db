import { clientSupabase } from '@/lib/supabase/client';
import { Button } from '../button';
import { Icons } from '../icons';

enum Provider {
  google = 'google',
  github = 'github',
}

export default function OAuthForm({
  isLoading,
  setIsLoading,
}: {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}) {
  const supabase = clientSupabase();

  const handleOauthProviderLogin = async (provider: Provider) => {
    setIsLoading(true);
    const redirectTo = `${window.location.origin}/auth/callback`;
    try {
      await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
    } catch (error: any) {
      alert(error.message || 'An error occurred. Please try again.');
    }
    setIsLoading(false);
  };
  return (
    <>
      <Button
        onClick={() => handleOauthProviderLogin(Provider.google)}
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
        onClick={() => handleOauthProviderLogin(Provider.github)}
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
