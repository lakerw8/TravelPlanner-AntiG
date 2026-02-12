import SwiftUI

struct LoginView: View {
    let authVM: AuthViewModel

    var body: some View {
        VStack(spacing: Spacing.xl) {
            Spacer()

            // App branding
            VStack(spacing: Spacing.sm) {
                Image(systemName: "airplane.departure")
                    .font(.system(size: 48))
                    .foregroundStyle(Color.appMint)

                Text("TravelPlanner")
                    .font(.headingLarge)
                    .foregroundStyle(Color.appText)

                Text("Plan your next adventure")
                    .font(.bodyLarge)
                    .foregroundStyle(Color.appMuted)
            }

            Spacer()

            // Sign in
            VStack(spacing: Spacing.md) {
                if let error = authVM.errorMessage {
                    Text(error)
                        .font(.bodySmall)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                }

                PrimaryButton(
                    title: "Sign in with Google",
                    tone: .dark,
                    isLoading: authVM.isLoading
                ) {
                    Task { await authVM.signInWithGoogle() }
                }
            }
            .padding(.horizontal, Spacing.xl)
            .padding(.bottom, Spacing.xxl)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.appBackground)
    }
}
