import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Minimal middleware - next-intl handles locale through request.ts
// This middleware just ensures proper request handling
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  // Match all paths except static files, api routes, and Next.js internals
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
