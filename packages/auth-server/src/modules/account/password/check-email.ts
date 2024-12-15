import { getUserByEmail } from '../../../model/users';

/**
 * Check if an email is already in use
 */
export async function checkEmail(email: string) {
  try {
    const user = await getUserByEmail(email);
    if (user) {
      return true;
    }
  } catch (e) {
    // User not found
  }
  return false;
}
