import { NextRequest, NextResponse } from 'next/server';
import {
  SUPABASE_CONNECTION_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} from './backend-config';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export function middlewareClient(req: NextRequest, res: NextResponse<unknown>) {
  return createMiddlewareClient(
    { req, res },
    {
      supabaseUrl: SUPABASE_CONNECTION_URL,
      supabaseKey: SUPABASE_SERVICE_ROLE_KEY,
    }
  );
}
