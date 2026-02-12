import Foundation
import Supabase
import Auth

// Set to true during development to bypass Google OAuth
private let DEV_BYPASS_AUTH = true
private let DEV_USER_ID = "dev-user-00000000-0000-0000-0000-000000000000"

@Observable
final class AuthViewModel {
    var isAuthenticated = false
    var isLoading = true
    var userId: String?
    var errorMessage: String?

    private var authStateTask: Task<Void, Never>?

    init() {
        if DEV_BYPASS_AUTH {
            isAuthenticated = true
            userId = DEV_USER_ID
            isLoading = false
        } else {
            listenToAuthChanges()
            Task { await checkSession() }
        }
    }

    deinit {
        authStateTask?.cancel()
    }

    // MARK: - Check existing session

    private func checkSession() async {
        do {
            let session = try await supabase.auth.session
            await MainActor.run {
                self.userId = session.user.id.uuidString
                self.isAuthenticated = true
                self.isLoading = false
            }
        } catch {
            await MainActor.run {
                self.isAuthenticated = false
                self.isLoading = false
            }
        }
    }

    // MARK: - Listen to auth state changes

    private func listenToAuthChanges() {
        authStateTask = Task { [weak self] in
            for await (event, session) in supabase.auth.authStateChanges {
                guard let self else { return }
                await MainActor.run {
                    switch event {
                    case .signedIn:
                        self.userId = session?.user.id.uuidString
                        self.isAuthenticated = true
                    case .signedOut:
                        self.userId = nil
                        self.isAuthenticated = false
                    default:
                        break
                    }
                    self.isLoading = false
                }
            }
        }
    }

    // MARK: - Sign in with Google

    func signInWithGoogle() async {
        guard !DEV_BYPASS_AUTH else { return }
        errorMessage = nil
        isLoading = true

        do {
            try await supabase.auth.signInWithOAuth(
                provider: .google,
                redirectTo: SupabaseConfig.redirectURL
            )
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
                self.isLoading = false
            }
        }
    }

    // MARK: - Handle OAuth callback

    func handleCallback(url: URL) async {
        guard !DEV_BYPASS_AUTH else { return }
        isLoading = true
        do {
            try await supabase.auth.session(from: url)
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
                self.isLoading = false
            }
        }
    }

    // MARK: - Sign out

    func signOut() async {
        if DEV_BYPASS_AUTH {
            isAuthenticated = false
            userId = nil
            return
        }
        do {
            try await supabase.auth.signOut()
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
            }
        }
    }
}
