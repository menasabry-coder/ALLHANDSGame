import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME, isAdminCookieValid } from "@/lib/adminAuth";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isLoginPage = pathname === "/admin/login";
  const cookieValue = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const authenticated = isAdminCookieValid(cookieValue);

  if (isLoginPage && authenticated) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (!isLoginPage && !authenticated) {
    const nextPath = pathname + search;
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
