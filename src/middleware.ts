import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "blackout-dev-secret"
);

interface TokenPayload {
  userId: string;
  role: string;
  status: string;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};

// Paths that never require authentication
const PUBLIC_PATHS = ["/login", "/api/auth"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );
}

async function verifyJWT(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths (login page, auth API routes) without auth
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Allow static file requests (anything with a file extension)
  if (pathname.includes(".")) {
    return NextResponse.next();
  }

  // Get token from cookie
  const token = request.cookies.get("blackout_token")?.value;

  if (!token) {
    // Unauthenticated -> redirect to /login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify JWT
  const payload = await verifyJWT(token);

  if (!payload) {
    // Invalid/expired token -> clear cookie and redirect to /login
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.set("blackout_token", "", {
      httpOnly: true,
      maxAge: 0,
      path: "/",
    });
    return response;
  }

  // Attach user info to request headers for downstream use
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", payload.userId);
  requestHeaders.set("x-user-role", payload.role);
  requestHeaders.set("x-user-status", payload.status);

  // ONBOARDING users can only access /onboarding and API routes
  if (payload.status === "ONBOARDING") {
    const isOnboardingPath =
      pathname === "/onboarding" || pathname.startsWith("/onboarding/");
    const isApiPath = pathname.startsWith("/api/");

    if (!isOnboardingPath && !isApiPath) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
  }

  // ACTIVE users who land on /onboarding should be redirected to /match
  if (
    payload.status === "ACTIVE" &&
    (pathname === "/onboarding" || pathname.startsWith("/onboarding/"))
  ) {
    return NextResponse.redirect(new URL("/match", request.url));
  }

  // ADMIN users accessing root (/) get redirected to /admin
  if (payload.role === "ADMIN" && pathname === "/") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}
