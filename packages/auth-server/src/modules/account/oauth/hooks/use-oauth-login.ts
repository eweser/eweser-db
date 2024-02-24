import { frontendSupabase } from '../../../../services/database/supabase/frontend-client-init';

export const OAUTH_PROVIDERS = ['google', 'github'] as const;

export type Provider = (typeof OAUTH_PROVIDERS)[number];

export function useOauthLogin({
  setIsLoading,
}: {
  setIsLoading: (loading: boolean) => void;
}) {
  const supabase = frontendSupabase();

  const handleOauthLogin = async (provider: Provider) => {
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
  return { handleOauthLogin };
}
