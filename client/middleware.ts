import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  
  // Check for both the local (HTTP) and production (HTTPS) cookie names
  const localSession = request.cookies.get("better-auth.session_token");
  const secureSession = request.cookies.get("__Secure-better-auth.session_token");

  if (!localSession && !secureSession) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*"],
};