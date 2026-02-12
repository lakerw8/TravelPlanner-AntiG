"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

async function syncSessionCookie(accessToken?: string) {
    if (accessToken) {
        await fetch("/api/auth/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessToken }),
        });
        return;
    }

    await fetch("/api/auth/session", { method: "DELETE" });
}

export function SessionSync() {
    const router = useRouter();

    useEffect(() => {
        const supabase = getSupabaseBrowserClient();

        supabase.auth.getSession().then(({ data }) => {
            void syncSessionCookie(data.session?.access_token);
        });

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            void syncSessionCookie(session?.access_token);
            if (event === "SIGNED_OUT") {
                router.replace("/login");
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [router]);

    return null;
}
