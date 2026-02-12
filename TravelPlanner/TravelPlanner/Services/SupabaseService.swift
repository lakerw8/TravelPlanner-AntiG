import Foundation
import Supabase

enum SupabaseConfig {
    static let url = URL(string: "***REMOVED***")!
    static let anonKey = "***REMOVED***"
    static let redirectURL = URL(string: "travelplanner://auth/callback")!
}

let supabase = SupabaseClient(
    supabaseURL: SupabaseConfig.url,
    supabaseKey: SupabaseConfig.anonKey
)
