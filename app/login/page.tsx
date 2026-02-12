"use client";

import Link from "next/link";
import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function LoginPage() {
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setErrorMessage(null);

        const supabase = getSupabaseBrowserClient();
        const redirectTo = `${window.location.origin}/auth/callback`;

        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo },
        });

        if (error) {
            setErrorMessage(error.message);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <Link href="/" className="mb-8 font-display text-4xl font-bold text-primary">
                Wanderlust
            </Link>

            <div className="w-full max-w-md bg-surface border border-accent rounded-2xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-text mb-2 text-center font-display">Welcome Back</h2>
                <p className="text-muted text-center mb-8">Sign in with Google to plan your next adventure.</p>

                <button
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 bg-white border border-accent hover:bg-accent text-text font-medium py-3 px-4 rounded-xl transition-all disabled:opacity-50"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                            fill="#EA4335"
                            d="M12 10.2v3.9h5.4c-.2 1.3-1.6 3.9-5.4 3.9-3.2 0-5.9-2.7-5.9-6s2.6-6 5.9-6c1.8 0 3 .8 3.7 1.4l2.5-2.4C16.6 3.4 14.5 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.2-3.8 9.2-9.2 0-.6-.1-1.1-.2-1.6H12Z"
                        />
                    </svg>
                    {loading ? "Redirecting..." : "Continue with Google"}
                </button>

                {errorMessage && (
                    <p className="mt-4 text-sm text-red-600 text-center">{errorMessage}</p>
                )}
            </div>
        </div>
    );
}
