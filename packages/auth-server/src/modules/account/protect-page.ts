import { redirect } from 'next/navigation';
import { getSessionUser } from './get-session-user';

export async function protectPage() {
  const { error, user } = await getSessionUser();

  if (error) {
    return redirect(
      `/error?message=${error?.message?.toString() || 'unauthenticated'}`
    );
  }
  return user;
}
