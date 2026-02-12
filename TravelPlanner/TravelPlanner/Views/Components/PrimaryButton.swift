import SwiftUI

enum ButtonTone {
    case dark, mint, outline

    var background: Color {
        switch self {
        case .dark: return .appOutline
        case .mint: return .appMint
        case .outline: return .clear
        }
    }

    var foreground: Color {
        switch self {
        case .dark: return .white
        case .mint: return .appText
        case .outline: return .appText
        }
    }
}

struct PrimaryButton: View {
    let title: String
    var tone: ButtonTone = .dark
    var isLoading: Bool = false
    var disabled: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: Spacing.xs) {
                if isLoading {
                    ProgressView()
                        .tint(tone.foreground)
                }
                Text(title)
                    .font(.labelMedium)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, Spacing.sm)
            .padding(.horizontal, Spacing.md)
            .background(tone.background)
            .foregroundStyle(tone.foreground)
            .clipShape(RoundedRectangle(cornerRadius: Radii.sm))
            .overlay {
                if tone == .outline {
                    RoundedRectangle(cornerRadius: Radii.sm)
                        .stroke(Color.appOutline, lineWidth: 1.5)
                }
            }
        }
        .disabled(disabled || isLoading)
        .opacity(disabled ? 0.5 : 1)
    }
}
