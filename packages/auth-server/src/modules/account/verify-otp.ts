'use server';
import { backendSupabase } from '@/services/database/supabase/backend-client-init';
import { authIdToUserId, logger } from '@/shared/utils';
import type { EmailOtpType } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createNewUsersProfileRooms } from '../rooms/create-new-user-profile-rooms';

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
  const supabase = backendSupabase(cookies());

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
    await createNewUsersProfileRooms(authIdToUserId(data.session.user.id));
  } catch (error) {
    logger(error);
  }
  return {};
}
