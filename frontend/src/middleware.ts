import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';

  // Define public paths that bypass tenant checks
  const isPublicPath =
    url.pathname === '/' ||
    url.pathname === '/login' ||
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/api/public') ||
    url.pathname.includes('favicon.ico');

  let tenantId: string | null = null;

  // Subdomain Extraction Logic
  // Handles production domains (e.g. acme.audittrail.com)
  const hostParts = hostname.split('.');
  if (
    hostParts.length > 2 &&
    !hostname.startsWith('localhost') &&
    !hostname.startsWith('127.0.0.1')
  ) {
    const subdomain = hostParts[0].toLowerCase();
    if (subdomain !== 'www' && subdomain !== 'app' && subdomain !== 'admin') {
      tenantId = subdomain;
    }
  }

  // Local Development Mimicry (localhost / 127.0.0.1)
  if (!tenantId && (hostname.startsWith('localhost') || hostname.startsWith('127.0.0.1'))) {
    // Check for query parameter (e.g., ?tenantId=company-a)
    const queryTenantId = url.searchParams.get('tenantId');
    if (queryTenantId) {
      tenantId = queryTenantId.toLowerCase();
    } else {
      // Check for incoming header (e.g., x-tenant-id)
      const headerTenant = request.headers.get('x-tenant-id');
      if (headerTenant) {
        tenantId = headerTenant.toLowerCase();
      }
    }
  }

  // Define protected paths requiring a validated tenant context
  const isProtectedPath =
    url.pathname.startsWith('/dashboard') ||
    url.pathname.startsWith('/settings') ||
    url.pathname.startsWith('/api/compliance');

  // Redirect to login if attempting to access protected resource without tenant context
  if (isProtectedPath && !tenantId) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Setup request headers object to forward resolved tenant information downstream
  const requestHeaders = new Headers(request.headers);
  if (tenantId) {
    requestHeaders.set('x-tenant-id', tenantId);
  }

  // Create response passing down modified headers to pages/API routers
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Attach resolved tenantId to response headers so client/observability tools see it
  if (tenantId) {
    response.headers.set('x-tenant-id', tenantId);
  }

  return response;
}

// Config to specify matching paths (runs on all paths except static assets)
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/public (Public APIs)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/public|_next/static|_next/image|favicon.ico).*)',
  ],
};
