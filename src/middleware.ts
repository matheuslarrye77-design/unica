import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/" || pathname.startsWith("/api")) return NextResponse.next();
  const token = request.cookies.get("koban_session")?.value;
  const isPublic = pathname === "/login" || pathname === "/setup" || pathname === "/esqueci" || pathname === "/redefinir";
  if (!token && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (token && isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/inicio";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|brand/).*)"],
};
