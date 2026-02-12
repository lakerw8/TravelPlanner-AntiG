import Foundation

// Copy this file to Secrets.swift and fill in your actual API keys.
// Secrets.swift is gitignored and will not be committed.

enum Secrets {
    static let googleApiKey = "YOUR_GOOGLE_API_KEY_HERE"

    static let supabaseURL = URL(string: "https://YOUR_PROJECT.supabase.co")!
    static let supabaseAnonKey = "YOUR_SUPABASE_ANON_KEY"
    static let supabaseRedirectURL = URL(string: "travelplanner://auth/callback")!
}
