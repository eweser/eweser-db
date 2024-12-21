import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { logger } from './shared/utils';

let approvedDomains: string[] = [];
let lastFetched = Date.now();

export async function middleware(req: NextRequest) {
  const response = NextResponse.next();
  const path = req.nextUrl.pathname;
  if (/\/access-grant\/(.*)/.exec(path)) {
    return response;
  }
  console.log('middleware', path);
  // Create Supabase server client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          console.log('setting cookies', cookiesToSet);
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );
  console.log('supabase created', supabase);

  // Refetch approved domains every 5 minutes
  if (approvedDomains.length === 0 || Date.now() - lastFetched > 300000) {
    if (process.env.NODE_ENV === 'development') {
      approvedDomains = [
        'localhost:8000',
        '172.31.42.92:8081',
        '172.31.42.92:5173',
        'localhost:5173',
      ];
      lastFetched = Date.now();
    } else {
      const { data: domains, error } = await supabase
        .from('apps')
        .select('domain');

      if (domains && !error) {
        approvedDomains = domains.map((app: { domain: string }) => app.domain);
        lastFetched = Date.now();
      } else {
        logger(error);
      }
    }
  }
  const origin = req.headers.get('origin');
  console.log('origin', origin);
  if (!origin) {
    console.log('no origin', req.headers.entries());
  }
  const domain = origin?.split('://')[1];
  console.log('domain', domain);
  const isOriginApproved = domain && approvedDomains.includes(domain);
  console.log('isOriginApproved', isOriginApproved, domain, approvedDomains);

  if (isOriginApproved) {
    response.headers.set('Access-Control-Allow-Origin', origin!);
    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET,DELETE,PATCH,POST,PUT,OPTIONS'
    );
    response.headers.set(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Dnt, Referer, User-Agent'
    );
  }

  // Return the response to keep session consistency
  return response;
}

export const config = {
  matcher: '/access-grant/(.*)',
};
