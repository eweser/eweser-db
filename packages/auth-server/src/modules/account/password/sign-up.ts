import { cookies } from 'next/headers';
import { backendSupabase } from '../../../services/database/supabase/backend-client-init';

export async function passwordSignUp(formData: FormData) {
  const supabase = backendSupabase(cookies());

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const signupData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };
  return await supabase.auth.signUp(signupData);
}
