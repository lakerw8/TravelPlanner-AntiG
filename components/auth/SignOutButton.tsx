"use client";

import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export function SignOutButton() {
    const router = useRouter();

    const handleSignOut = async () => {
        const supabase = getSupabaseBrowserClient();
        await supabase.auth.signOut();
        await fetch("/api/auth/session", { method: "DELETE" });
        router.replace("/login");
    };

    return (
        <button
            onClick={handleSignOut}
            className="text-sm font-medium text-text hover:text-primary transition-colors"
            type="button"
        >
            Sign Out
        </button>
    );
}
