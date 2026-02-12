import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
    const body = await request.json() as { accessToken?: string };
    if (!body.accessToken) {
        return NextResponse.json({ error: "Missing access token" }, { status: 400 });
    }

    const { data, error } = await supabase.auth.getUser(body.accessToken);
    if (error || !data.user) {
        return NextResponse.json({ error: "Invalid access token" }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set({
        name: ACCESS_TOKEN_COOKIE,
        value: body.accessToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
    });
    return response;
}

export async function DELETE() {
    const response = NextResponse.json({ success: true });
    response.cookies.set({
        name: ACCESS_TOKEN_COOKIE,
        value: "",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
    });
    return response;
}
