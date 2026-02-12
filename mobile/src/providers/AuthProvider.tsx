import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from "react";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Session } from "@supabase/supabase-js";

import { supabase } from "@/src/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function parseTokensFromHash(callbackUrl: string): { accessToken?: string; refreshToken?: string } {
  const hash = callbackUrl.split("#")[1];
  if (!hash) return {};

  const params = new URLSearchParams(hash);
  const accessToken = params.get("access_token") ?? undefined;
  const refreshToken = params.get("refresh_token") ?? undefined;
  return { accessToken, refreshToken };
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (isMounted) {
          setSession(data.session ?? null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      authError,
      signInWithGoogle: async () => {
        setAuthError(null);
        const redirectTo = Linking.createURL("auth/callback");

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo,
            skipBrowserRedirect: true
          }
        });

        if (error || !data?.url) {
          setAuthError(error?.message ?? "Unable to start Google sign-in.");
          return;
        }

        const authResult = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (authResult.type !== "success" || !authResult.url) {
          if (authResult.type !== "cancel") {
            setAuthError("Google sign-in did not complete.");
          }
          return;
        }

        const callbackUrl = new URL(authResult.url);
        const code = callbackUrl.searchParams.get("code");

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            setAuthError(exchangeError.message);
          }
          return;
        }

        const { accessToken, refreshToken } = parseTokensFromHash(authResult.url);
        if (!accessToken || !refreshToken) {
          setAuthError("Missing auth tokens from callback.");
          return;
        }

        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (setSessionError) {
          setAuthError(setSessionError.message);
        }
      },
      signOut: async () => {
        setAuthError(null);
        const { error } = await supabase.auth.signOut();
        if (error) {
          setAuthError(error.message);
        }
      }
    }),
    [session, loading, authError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
