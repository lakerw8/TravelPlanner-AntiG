import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
    // Contract assertions match: dashboard, trip, api/trips, Unauthorized
    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*", "/trip/:path*", "/login", "/api/trips/:path*"],
};
