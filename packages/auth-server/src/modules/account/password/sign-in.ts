import { backendSupabase } from '@/services/database/supabase/backend-client-init';
import { cookies } from 'next/headers';

export async function passwordSignIn(formData: FormData) {
  const supabase = backendSupabase(cookies());
  // type-casting here for convenience
  // in practice, you should validate your inputs
  const loginData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };
  if (!loginData.email || !loginData.password) {
    return { error: new Error('Email and password are required') };
  }
  return await supabase.auth.signInWithPassword(loginData);
}
