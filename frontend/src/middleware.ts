import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define the routes that require wallet connection
const protectedRoutes = ["/deposit", "/withdraw", "/send", "/transactions"]; // Add other routes as needed

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the requested path is one of the protected routes
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Check for a cookie indicating the wallet is connected
  const isWalletConnected = request.cookies.has("wallet_connected");

  // If trying to access a protected route without a connected wallet, redirect to onboarding
  if (isProtectedRoute && !isWalletConnected) {
    const onboardingUrl = new URL("/", request.url);
    const response = NextResponse.redirect(onboardingUrl);
    response.headers.set("x-auth-expired", "true");
    return response;
  }

  // Allow the request to proceed if not a protected route or if wallet is connected
  return NextResponse.next();
}

// Configure the middleware to run only on specified paths (or exclude assets)
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - onboarding (the page we redirect to)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|onboarding).*)",
  ],
};
