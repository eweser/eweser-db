'use server';
import { serverSupabase } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function login(formData: FormData) {
  'use server';

  const cookieStore = cookies();
  const supabase = serverSupabase(cookieStore);
  // type-casting here for convenience
  // in practice, you should validate your inputs
  const loginData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };
  if (!loginData.email || !loginData.password) {
    return;
  }

  const { error } = await supabase.auth.signInWithPassword(loginData);

  if (error) {
    redirect(`/error?message=${error.message?.toString()}`);
  }

  revalidatePath('/', 'layout');
  redirect('/home');
}

export async function signup(formData: FormData) {
  'use server';

  const cookieStore = cookies();
  const supabase = serverSupabase(cookieStore);

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const signupData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const { error } = await supabase.auth.signUp(signupData);

  if (error) {
    redirect(`/error?message=${error.message?.toString()}`);
  }

  revalidatePath('/', 'layout');
  redirect('/home');
}
