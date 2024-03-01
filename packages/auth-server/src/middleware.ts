import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import {
  SUPABASE_CONNECTION_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} from './services/database/supabase/backend-config';
import { logger } from './shared/utils';

let approvedDomains: string[] = [];
let lastFetched = new Date().getTime();
export async function middleware(req: NextRequest, res: NextResponse) {
  // only refetch the approved domains every 5 minutes
  if (
    approvedDomains.length === 0 ||
    new Date().getTime() - lastFetched > 300000
  ) {
    const supabase = createMiddlewareClient(
      { req, res },
      {
        supabaseUrl: SUPABASE_CONNECTION_URL,
        supabaseKey: SUPABASE_SERVICE_ROLE_KEY,
      }
    );
    const { data: domains, error } = await supabase
      .from('apps')
      .select('domain');
    if (domains && !error) {
      approvedDomains = domains.map((app) => app.domain);
    } else {
      logger(error);
    }
  }
  const origin = req.headers.get('origin');
  const domain = origin?.split('://')[1];
  const isOriginApproved = domain && approvedDomains.includes(domain);

  const response = NextResponse.next();

  if (isOriginApproved) {
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set(
      'Access-Control-Allow-Methods',
      'GET,DELETE,PATCH,POST,PUT,OPTIONS'
    );
    res.headers.set(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Dnt, Referer, User-Agent'
    );
  }

  return res;
}

export const config = {
  matcher: '/access-grant/sync-registry',
};
