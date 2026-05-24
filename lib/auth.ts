import { NextResponse } from "next/server";
import { SupabaseClient, User } from "@supabase/supabase-js";
import { supabase, createServerClient } from "@/lib/supabase";

export const ACCESS_TOKEN_COOKIE = "sb-access-token";

export interface AuthResult {
    user: User;
    supabase: SupabaseClient;
    error?: undefined;
}

export interface AuthError {
    user?: undefined;
    supabase?: undefined;
    error: NextResponse;
}

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

/**
 * Authenticate the request and return a per-request Supabase client
 * that carries the user's JWT (so RLS policies see `auth.uid()`).
 */
export async function requireAuthenticatedUser(request: Request): Promise<AuthResult | AuthError> {
    const accessToken = getAccessTokenFromRequest(request);
    if (!accessToken) {
        return {
            error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        };
    }

    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data.user) {
        return {
            error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        };
    }

    return {
        user: data.user,
        supabase: createServerClient(accessToken),
    };
}

export async function userOwnsTrip(client: SupabaseClient, tripId: string, userId: string): Promise<boolean> {
    const { data: trip, error } = await client
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
        const { error: claimError } = await client
            .from("trips")
            .update({ user_id: userId })
            .eq("id", tripId)
            .is("user_id", null);

        return !claimError;
    }

    return false;
}

/**
 * Resolves a client for the trip.
 * If the user is logged in, we use their user JWT client.
 * If the user is not logged in, we fallback to the unauthenticated public client
 * (which can perform collaborative operations since we relaxed RLS).
 */
export async function getTripClient(request: Request): Promise<{
    user: User | null;
    supabase: SupabaseClient;
}> {
    const accessToken = getAccessTokenFromRequest(request);
    if (accessToken) {
        const { data, error } = await supabase.auth.getUser(accessToken);
        if (!error && data?.user) {
            return { user: data.user, supabase: createServerClient(accessToken) };
        }
    }

    // Anonymous fallback: public client. RLS is relaxed for collaborative guest access.
    return { user: null, supabase };
}
