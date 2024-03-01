import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { handleServerErrorRedirect } from '../../../../shared/utils';
import { oAuthLoginCallback } from '../../../../modules/account/oauth/login-callback';

export async function GET(
  request: NextRequest,
  { params }: { params: { next?: string } }
) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  // if "next" is in param, use it as the redirect URL
  const next = params.next ?? '/home';

  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = next;
  redirectTo.searchParams.delete('code');

  const { error } = await oAuthLoginCallback({ code });
  if (error) {
    return handleServerErrorRedirect(error, redirectTo);
  }

  return NextResponse.redirect(redirectTo);
}
