import { redirect } from 'next/navigation';
import { getUser } from './get-user';

export async function protectPage() {
  const { error, user } = await getUser();

  if (error) {
    return redirect(
      `/error?message=${error?.message?.toString() || 'unauthenticated'}`
    );
  }
  return user;
}
