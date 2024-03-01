// src/middleware.js or src/app/middleware.js
import { NextResponse } from 'next/server';

const approvedDomains = ['localhost:8000'];
export function middleware(request: Request) {
  const origin = request.headers.get('origin');
  const domain = origin?.split('://')[1];
  const isOriginApproved = domain && approvedDomains.includes(domain);

  const res = NextResponse.next();

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
