'use server';

import type { EmailOtpType } from '@supabase/supabase-js';
import { createNewUserRoomsAndAuthServerAccess } from './create-new-user-rooms-and-auth-server-access';
import { backendSupabase } from '../../services/database/supabase/backend-client-init';
import { logger } from '../../shared/utils';

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
  const supabase = await backendSupabase();

  const { error, data } = await supabase.auth.verifyOtp({
    type,
    token_hash,
  });
  if (error) {
    return { error };
  } else if (!data.session?.user.id) {
    return { error: new Error('Invalid session') };
  }
  try {
    await createNewUserRoomsAndAuthServerAccess(data.session.user.id);
  } catch (error) {
    logger(error);
  }
  return {};
}
