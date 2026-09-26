import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("hirelens_token")?.value;
  const role = request.cookies.get("hirelens_role")?.value;

  const isStudentRoute = pathname.startsWith("/student");
  const isRecruiterRoute = pathname.startsWith("/recruiter");
  const isAdminRoute = pathname.startsWith("/admin");
  const isLoginRoute = pathname === "/login";

  // Redirect already authenticated users away from /login unless an error is present
  if (isLoginRoute && token && role && !request.nextUrl.searchParams.has("error")) {
    if (role === "STUDENT") {
      return NextResponse.redirect(new URL("/student", request.url));
    }
    if (role === "RECRUITER") {
      return NextResponse.redirect(new URL("/recruiter", request.url));
    }
    if (role === "COLLEGE_ADMIN") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  if (isStudentRoute || isRecruiterRoute || isAdminRoute) {
    if (!token || !role) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (isStudentRoute && role !== "STUDENT") {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("error", "unauthorized_role");
      redirectUrl.searchParams.set("required", "STUDENT");
      return NextResponse.redirect(redirectUrl);
    }

    if (isRecruiterRoute && role !== "RECRUITER") {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("error", "unauthorized_role");
      redirectUrl.searchParams.set("required", "RECRUITER");
      return NextResponse.redirect(redirectUrl);
    }

    if (isAdminRoute && role !== "COLLEGE_ADMIN") {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("error", "unauthorized_role");
      redirectUrl.searchParams.set("required", "COLLEGE_ADMIN");
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/student/:path*", "/recruiter/:path*", "/admin/:path*", "/login"],
};
