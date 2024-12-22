import { NextResponse, type NextRequest } from 'next/server';
import { logger } from './shared/utils';
import {
  createMiddlewareSupabaseClient,
  updateSession,
} from './services/database/supabase/middleware';
const publicEndpoints = [/access-grant/];
/** basically any endpoint that uses supabase, so check the imports of the backendClient */
const needsSupabaseEndpoints = [/access-grant/, /auth/, /home/];
export async function middleware(req: NextRequest) {
  let approvedDomains: string[] = [];
  const path = req.nextUrl.pathname;
  console.log('path', path);
  if (publicEndpoints.every((endpoint) => !endpoint.test(path))) {
    // for non public endpoints, don't need to set cors and check origin
    if (needsSupabaseEndpoints.some((endpoint) => endpoint.test(path))) {
      // if the endpoint needs supabase, update the session
      console.log('updating session');
      return updateSession(req);
    }
    console.log('no need to update session');
    return NextResponse.next();
  }

  const { supabase, response } = createMiddlewareSupabaseClient(req);

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
  const origin = req.headers.get('origin');
  if (!origin) {
    console.log('no origin', req.headers.entries());
  }
  const domain = origin?.split('://')[1];
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
