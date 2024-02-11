const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env
  .NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (
  typeof NEXT_PUBLIC_SUPABASE_URL !== 'string' ||
  NEXT_PUBLIC_SUPABASE_URL.length === 0
) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined');
}
if (
  typeof NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'string' ||
  NEXT_PUBLIC_SUPABASE_ANON_KEY.length === 0
) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined');
}

export { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY };
