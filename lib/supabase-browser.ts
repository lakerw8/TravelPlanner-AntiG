"use client";

import { SupabaseClient, User } from "@supabase/supabase-js";

const mockUser: User = {
    id: "00000000-0000-0000-0000-000000000000",
    email: "test@example.com",
    role: "authenticated",
    aud: "authenticated",
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
} as any;

class MockChannel {
    private name: string;
    private callbacks: Record<string, Function[]> = {};

    constructor(name: string) {
        this.name = name;
    }

    on(type: string, filter: any, callback: Function) {
        if (!this.callbacks[type]) {
            this.callbacks[type] = [];
        }
        this.callbacks[type].push(callback);
        return this;
    }

    subscribe() {
        return this;
    }

    track(state: any) {
        return this;
    }

    unsubscribe() {
        return Promise.resolve();
    }

    presenceState() {
        return {};
    }

    send(payload: any) {
        return this;
    }
}

const mockBrowserClient = {
    auth: {
        getUser: async () => ({ data: { user: mockUser }, error: null }),
        getSession: async () => ({ data: { session: { access_token: "mock-token", user: mockUser } }, error: null }),
        signOut: async () => ({ error: null }),
        signInWithOAuth: async () => ({ data: {}, error: null }),
        onAuthStateChange: (cb: any) => {
            // Trigger immediately to let components know they're authenticated
            setTimeout(() => cb("SIGNED_IN", { access_token: "mock-token", user: mockUser }), 0);
            return { data: { subscription: { unsubscribe: () => {} } } };
        },
        exchangeCodeForSession: async () => ({ data: { session: { access_token: "mock-token" } }, error: null }),
        setSession: async () => ({ data: { session: { access_token: "mock-token" } }, error: null }),
    },
    channel(name: string, config?: any) {
        return new MockChannel(name);
    },
    from(tableName: string) {
        return {
            select: () => ({
                eq: () => Promise.resolve({ data: [], error: null })
            })
        };
    }
};

export function getSupabaseBrowserClient(): SupabaseClient {
    return mockBrowserClient as unknown as SupabaseClient;
}
