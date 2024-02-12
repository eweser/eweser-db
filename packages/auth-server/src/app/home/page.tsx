import { serverSupabase } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function Home() {
  const cookieStore = cookies();
  const supabase = serverSupabase(cookieStore);

  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    return redirect(
      `/auth/error?message=${error?.message?.toString() || 'unauthenticated'}`
    );
  }

  return <p>Hello {data.user.email}</p>;
}
