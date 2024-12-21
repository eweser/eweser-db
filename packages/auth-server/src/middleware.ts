import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { logger } from './shared/utils';
import { middlewareClient } from './services/database/supabase/middleware-client-init';

let approvedDomains: string[] = [];
let lastFetched = new Date().getTime();
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // only refetch the approved domains every 5 minutes
  if (
    approvedDomains.length === 0 ||
    new Date().getTime() - lastFetched > 300000
  ) {
    if (process.env.NODE_ENV === 'development') {
      approvedDomains = [
        'localhost:8000',
        '172.31.42.92:8081',
        '172.31.42.92:5173',
        'localhost:5173',
      ];
      lastFetched = new Date().getTime();
    } else {
      const supabase = middlewareClient(req, res);
      const { data: domains, error } = await supabase
        .from('apps')
        .select('domain');
      if (domains && !error) {
        approvedDomains = domains.map((app: { domain: string }) => app.domain);
        lastFetched = new Date().getTime();
      } else {
        logger(error);
      }
    }
  }
  const origin = req.headers.get('origin');
  const domain = origin?.split('://')[1];
  const isOriginApproved = domain && approvedDomains.includes(domain);

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
  matcher: '/access-grant/(.*)',
};
