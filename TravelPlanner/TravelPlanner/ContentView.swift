import SwiftUI

struct ContentView: View {
    @State private var authVM = AuthViewModel()

    var body: some View {
        Group {
            if authVM.isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color.appBackground)
            } else if authVM.isAuthenticated {
                TripsListView(authVM: authVM)
            } else {
                LoginView(authVM: authVM)
            }
        }
        .onOpenURL { url in
            Task { await authVM.handleCallback(url: url) }
        }
    }
}
