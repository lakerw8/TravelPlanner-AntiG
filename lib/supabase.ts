import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/** Global unauthenticated client — used for token verification and anonymous
 *  collaborative access (RLS is relaxed for guest sharing). */
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

/** Create a per-request Supabase client authenticated with the user's JWT.
 *  RLS policies will see `auth.uid()` as the real user. */
export function createServerClient(accessToken: string): SupabaseClient {
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
