import { NextRequest, NextResponse } from "next/server";

const ACCESS_TOKEN_COOKIE = "sb-access-token";

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

    const isProtectedPage = pathname.startsWith("/dashboard") || pathname.startsWith("/trip/");
    const isTripsApi = pathname.startsWith("/api/trips");
    const isLoginPage = pathname === "/login";

    if (!accessToken && isProtectedPage) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    if (!accessToken && isTripsApi) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (accessToken && isLoginPage) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*", "/trip/:path*", "/login", "/api/trips/:path*"],
};
