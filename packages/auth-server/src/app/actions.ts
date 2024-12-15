'use server';
import { checkEmail } from '../modules/account/password/check-email';
import { passwordSignIn } from '../modules/account/password/sign-in';
import { passwordSignUp } from '../modules/account/password/sign-up';
import { logger } from '../shared/utils';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function login(formData: FormData) {
  const { error } = await passwordSignIn(formData);

  if (error) {
    logger(error);
    redirect(`/error?message=${error.message?.toString()}`);
  }

  revalidatePath('/', 'layout');
  redirect('/home');
}

export async function signup(formData: FormData) {
  const { error } = await passwordSignUp(formData);

  if (error) {
    logger(error);
    redirect(`/error?message=${error.message?.toString()}`);
  }

  revalidatePath('/', 'layout');
  redirect('/auth/await-confirm');
}

export async function checkEmailExists(formData: FormData) {
  const email = formData.get('email') as string;
  const hasEmail = await checkEmail(email);

  return { userExists: hasEmail };
}
