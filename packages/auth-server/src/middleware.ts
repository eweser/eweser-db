import { NextResponse, type NextRequest } from 'next/server';
import { logger } from './shared/utils';
import { updateSession } from './services/database/supabase/middleware';
const corsOptions = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Dnt, Referer, User-Agent',
};

const publicEndpoints = [/access-grant/];
const publicPages = [/statement/];
export async function middleware(req: NextRequest) {
  let approvedDomains: string[] = [];
  const path = req.nextUrl.pathname;
  console.log('path', path);

  const { supabase, response, userAuthed } = await updateSession(req);
  if (publicEndpoints.every((endpoint) => !endpoint.test(path))) {
    if (!userAuthed) {
      if (publicPages.some((page) => page.test(path))) {
        return response;
      }
      const url = req.nextUrl.clone();
      url.pathname = '/';
      // don't redirect options requests
      if (req.nextUrl.pathname !== '/') {
        console.log('redirecting to / from', path);
        return NextResponse.redirect(url.toString(), { status: 302 });
      }
      return response;
    }
    // for non public endpoints, don't need to set cors and check origin
    // if the endpoint needs supabase, update the session
    console.log('private endpoint');
    return response;
  }

  if (process.env.NODE_ENV === 'development') {
    approvedDomains = [
      'localhost:8000',
      '172.31.42.92:8081',
      '172.31.42.92:5173',
      'localhost:5173',
    ];
  } else {
    const { data: domains, error } = await supabase
      .from('apps')
      .select('domain');
    logger('domains', domains, error);

    if (domains && !error) {
      approvedDomains = domains.map((app: { domain: string }) => app.domain);
    } else {
      logger(error);
    }
  }
  const origin = req.headers.get('Origin') ?? req.headers.get('origin');
  if (!origin) {
    console.log('no origin', req.headers.entries());
  }
  const domain = origin?.split('://')[1];
  const isOriginApproved = domain && approvedDomains.includes(domain);
  console.log('isOriginApproved', isOriginApproved, domain, approvedDomains);

  const isPreflight = req.method === 'OPTIONS';

  if (isPreflight) {
    const preflightHeaders = {
      ...(isOriginApproved && { 'Access-Control-Allow-Origin': origin }),
      ...corsOptions,
    };
    return NextResponse.json({}, { headers: preflightHeaders });
  }
  if (isOriginApproved) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }

  Object.entries(corsOptions).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
