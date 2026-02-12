"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function AuthCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        const completeSignIn = async () => {
            const code = searchParams.get("code");
            const supabase = getSupabaseBrowserClient();

            if (code) {
                const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
                if (exchangeError) {
                    setErrorMessage(exchangeError.message);
                    return;
                }
            }

            const { data, error } = await supabase.auth.getSession();
            if (error || !data.session?.access_token) {
                setErrorMessage(error?.message ?? "Failed to establish session.");
                return;
            }

            await fetch("/api/auth/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ accessToken: data.session.access_token }),
            });

            router.replace("/dashboard");
        };

        void completeSignIn();
    }, [router, searchParams]);

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-surface border border-accent rounded-2xl shadow-lg p-8 text-center">
                <h1 className="font-display text-2xl font-bold text-text mb-2">Signing You In</h1>
                {errorMessage ? (
                    <p className="text-sm text-red-600">{errorMessage}</p>
                ) : (
                    <p className="text-sm text-muted">Completing secure login...</p>
                )}
            </div>
        </div>
    );
}
