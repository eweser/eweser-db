import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { handleServerErrorRedirect } from '../../../shared/utils';

import { oAuthLoginCallback } from '../../../modules/account/oauth/login-callback';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = '/home';

  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = next;
  redirectTo.searchParams.delete('code');

  const { error } = await oAuthLoginCallback({ code });
  if (error) {
    return handleServerErrorRedirect(error, redirectTo);
  }

  return NextResponse.redirect(redirectTo);
}
