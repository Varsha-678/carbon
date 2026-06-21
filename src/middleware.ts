import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose'; // jose is standard in Next.js middleware because jsonwebtoken uses node:crypto which isn't always available in Edge Runtime.

// jose token verification helper since next.js middleware runs in Edge Runtime
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-for-dev-only-change-in-prod'
);

// Simple in-memory rate limiting map
// Maps IP -> array of request timestamps
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 60; // 60 requests per minute

/**
 * Basic rate limiting check.
 * Returns true if request is allowed, false if limit exceeded.
 */
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];

  // Filter timestamps within the window
  const activeTimestamps = timestamps.filter((time) => now - time < RATE_LIMIT_WINDOW);
  
  if (activeTimestamps.length >= MAX_REQUESTS) {
    return true;
  }

  activeTimestamps.push(now);
  rateLimitMap.set(ip, activeTimestamps);
  return false;
}

export async function middleware(request: NextRequest) {
  const ip = request.ip || request.headers.get('x-forwarded-for') || '127.0.0.1';
  const url = request.nextUrl.clone();

  // Apply rate limiting on all API routes
  if (url.pathname.startsWith('/api/')) {
    if (isRateLimited(ip)) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // Define response headers object
  const responseHeaders = new Headers();
  
  // CORS Configuration
  const origin = request.headers.get('origin');
  const allowedOrigins = ['http://localhost:3000', 'https://carboncompass.vercel.app'];
  
  if (origin && allowedOrigins.includes(origin)) {
    responseHeaders.set('Access-Control-Allow-Origin', origin);
  }
  responseHeaders.set('Access-Control-Allow-Credentials', 'true');
  responseHeaders.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  responseHeaders.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, x-user-id'
  );

  // Handle CORS preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: responseHeaders,
    });
  }

  // Add Secure HTTP Headers (XSS, CSRF, Clickjacking protection)
  responseHeaders.set('X-Frame-Options', 'DENY');
  responseHeaders.set('X-Content-Type-Options', 'nosniff');
  responseHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  responseHeaders.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self';"
  );
  if (process.env.NODE_ENV === 'production') {
    responseHeaders.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // Auth protection for private api routes
  const privateApiRoutes = [
    '/api/baseline',
    '/api/logs',
    '/api/goals',
    '/api/insights',
  ];

  const isPrivateRoute = privateApiRoutes.some((route) => url.pathname.startsWith(route));

  if (isPrivateRoute) {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized: No token provided' }),
        {
          status: 401,
          headers: { ...Object.fromEntries(responseHeaders), 'Content-Type': 'application/json' },
        }
      );
    }

    try {
      // Verify token using jose (web crypto API compatible)
      const { payload } = await jose.jwtVerify(token, JWT_SECRET);
      
      // Request clone to pass the userId header
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', payload.userId as string);

      const response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });

      // Apply the secure headers to the next response
      responseHeaders.forEach((value, key) => {
        response.headers.set(key, value);
      });

      return response;
    } catch {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        {
          status: 401,
          headers: { ...Object.fromEntries(responseHeaders), 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // Fallback for non-protected API or standard page routing
  const response = NextResponse.next();
  responseHeaders.forEach((value, key) => {
    response.headers.set(key, value);
  });
  return response;
}

export const config = {
  matcher: ['/api/:path*', '/((?!_next/static|_next/image|favicon.ico).*)'],
};
