import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";
import type { NextRequest } from "next/server";

/**
 * Hostnames that identify the app subdomain.
 * Requests from these are routed to /(app) routes.
 */
const APP_HOSTS = ["app.dispatchtogo.ca", "app.localhost"];

export default withAuth(
  function middleware(req: NextRequest) {
    const host = req.headers.get("host") ?? "";
    const isAppHost = APP_HOSTS.some((h) => host.startsWith(h));

    // If on app subdomain and not already under /app, rewrite
    if (isAppHost && !req.nextUrl.pathname.startsWith("/app")) {
      const url = req.nextUrl.clone();
      url.pathname = `/app${req.nextUrl.pathname}`;
      return NextResponse.rewrite(url);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Always allow public routes
        if (
          pathname.startsWith("/app/login") ||
          pathname.startsWith("/app/register") ||
          pathname.startsWith("/app/vendor/accept-invite") ||
          pathname.startsWith("/api/auth") ||
          pathname === "/" ||
          pathname.startsWith("/pricing") ||
          pathname.startsWith("/about")
        ) {
          return true;
        }

        // Everything else requires a valid token
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).)*",
  ],
};
