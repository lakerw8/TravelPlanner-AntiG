import SwiftUI

enum PillTone {
    case mint, yellow, lavender, surface

    var background: Color {
        switch self {
        case .mint: return .appMint
        case .yellow: return .appYellow
        case .lavender: return .appLavender
        case .surface: return .appSurface
        }
    }
}

struct TagPill: View {
    let text: String
    var tone: PillTone = .surface

    var body: some View {
        Text(text)
            .font(.labelSmall)
            .foregroundStyle(Color.appText)
            .padding(.horizontal, Spacing.xs)
            .padding(.vertical, Spacing.xxxs)
            .background(tone.background)
            .clipShape(Capsule())
    }
}
