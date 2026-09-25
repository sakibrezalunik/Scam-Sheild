import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionToken } from "@/lib/auth/session";

// Routes that require authentication
const AUTH_REQUIRED = ["/dashboard", "/account", "/admin"];

// Routes that redirect away if already authenticated
const AUTH_ONLY = ["/login", "/signup"];

// Security headers applied to all responses
const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "0",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
};

// Allowed origins for CORS — desktop WebView and web app only
const ALLOWED_CORS_ORIGINS = [
  "tauri://localhost",
  "https://scamshield.app",
  "http://localhost:3000",
  "http://localhost:1420",
];

function setCorsHeaders(response: NextResponse, origin: string): void {
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  response.headers.set("Access-Control-Max-Age", "86400");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // CORS handling for API routes
  if (pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin") || "";
    const isAllowedOrigin = ALLOWED_CORS_ORIGINS.includes(origin);

    // Preflight request — respond directly
    if (request.method === "OPTIONS") {
      const response = new NextResponse(null, { status: 204 });
      if (isAllowedOrigin) {
        setCorsHeaders(response, origin);
      }
      return response;
    }

    // Actual request — add CORS headers to the continuing response
    const response = NextResponse.next();
    if (isAllowedOrigin) {
      setCorsHeaders(response, origin);
    }
    return response;
  }

  // Lightweight session check: only reads the cookie, no database access.
  // Full session validation happens in API routes and server components.
  const token = await getSessionToken();
  const isAuthenticated = token !== null;

  // Protected routes — redirect to login if no session cookie
  if (AUTH_REQUIRED.some((p) => pathname.startsWith(p))) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Authenticated: block access to login/signup pages
    if (AUTH_ONLY.some((p) => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Apply security headers to all responses
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: [
    "/api/:path*",
    "/dashboard/:path*",
    "/account/:path*",
    "/login",
    "/signup",
    "/scan",
    "/results/:path*",
    "/admin/:path*",
  ],
};
