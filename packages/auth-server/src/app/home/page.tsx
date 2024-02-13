import { serverSupabase } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function Home() {
  const supabase = serverSupabase(cookies());

  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    return redirect(
      `/error?message=${error?.message?.toString() || 'unauthenticated'}`
    );
  }

  // const profile = get public and private profile rooms from db. if they don't exist, create them and show "setting up profile" spinner.
  // on the client side, check if db

  return <p>Hello {data.user.email}</p>;
}
