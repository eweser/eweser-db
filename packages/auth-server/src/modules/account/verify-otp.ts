import { backendSupabase } from '@/services/database/supabase/backend-client-init';
import type { EmailOtpType } from '@supabase/supabase-js';

export async function verifyOtp({
  token_hash,
  type,
}: {
  token_hash: string | null;
  type: EmailOtpType | null;
}) {
  if (!token_hash || !type) {
    return { error: new Error('Invalid token_hash or type') };
  }
  const supabase = backendSupabase();

  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash,
  });
  if (error) {
    return { error };
  } else {
    return {};
  }
}
