import { NextResponse } from "next/server";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export const ACCESS_TOKEN_COOKIE = "sb-access-token";

function getCookieValue(cookieHeader: string | null, cookieName: string): string | null {
    if (!cookieHeader) return null;

    const targetPrefix = `${cookieName}=`;
    const parts = cookieHeader.split(";").map((part) => part.trim());
    for (const part of parts) {
        if (part.startsWith(targetPrefix)) {
            return decodeURIComponent(part.substring(targetPrefix.length));
        }
    }
    return null;
}

function getAccessTokenFromAuthorizationHeader(authorizationHeader: string | null): string | null {
    if (!authorizationHeader) return null;

    const [scheme, ...tokenParts] = authorizationHeader.trim().split(/\s+/);
    if (!scheme || scheme.toLowerCase() !== "bearer") {
        return null;
    }

    const token = tokenParts.join(" ").trim();
    return token || null;
}

export function getAccessTokenFromRequest(request: Request): string | null {
    const bearerToken = getAccessTokenFromAuthorizationHeader(request.headers.get("authorization"));
    if (bearerToken) {
        return bearerToken;
    }

    return getCookieValue(request.headers.get("cookie"), ACCESS_TOKEN_COOKIE);
}

export async function requireAuthenticatedUser(request: Request): Promise<{ user: User | null; error: NextResponse | null }> {
    // TODO: remove dev bypass when done testing
    const DEV_BYPASS_AUTH = true;
    if (DEV_BYPASS_AUTH) {
        return {
            user: { id: "dev-test-user", email: "dev@test.com" } as User,
            error: null,
        };
    }

    const accessToken = getAccessTokenFromRequest(request);
    if (!accessToken) {
        return {
            user: null,
            error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        };
    }

    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data.user) {
        return {
            user: null,
            error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        };
    }

    return { user: data.user, error: null };
}

export async function userOwnsTrip(tripId: string, userId: string): Promise<boolean> {
    const { data: trip, error } = await supabase
        .from("trips")
        .select("id,user_id")
        .eq("id", tripId)
        .maybeSingle();

    if (error) {
        return false;
    }

    if (!trip?.id) {
        return false;
    }

    if (trip.user_id === userId) {
        return true;
    }

    // Legacy development rows may have no owner; claim them on first authenticated access.
    if (!trip.user_id) {
        const { error: claimError } = await supabase
            .from("trips")
            .update({ user_id: userId })
            .eq("id", tripId)
            .is("user_id", null);

        return !claimError;
    }

    return false;
}
