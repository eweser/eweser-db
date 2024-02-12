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

  return <p>Hello {data.user.email}</p>;
}
