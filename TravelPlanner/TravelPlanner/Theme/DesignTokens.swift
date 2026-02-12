import SwiftUI

// MARK: - Colors

extension Color {
    // Backgrounds
    static let appBackground = Color(hex: 0xF4EFE3)
    static let appSurface = Color(hex: 0xF8F8F8)
    static let appCard = Color(hex: 0xF2F2F2)

    // Text
    static let appText = Color(hex: 0x171717)
    static let appMuted = Color(hex: 0x6B7280)
    static let appOutline = Color(hex: 0x111111)

    // Accent
    static let appMint = Color(hex: 0x8EDFD2)
    static let appYellow = Color(hex: 0xF4CB78)
    static let appLavender = Color(hex: 0xDCD0F0)

    // Nav
    static let navBackground = Color(hex: 0x07090D)
    static let navActive = Color(hex: 0xF9E27D)

    // Hex initializer
    init(hex: UInt, alpha: Double = 1.0) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: alpha
        )
    }
}

// MARK: - Spacing

enum Spacing {
    static let xxxs: CGFloat = 2
    static let xxs: CGFloat = 4
    static let xs: CGFloat = 8
    static let sm: CGFloat = 12
    static let md: CGFloat = 16
    static let lg: CGFloat = 24
    static let xl: CGFloat = 32
    static let xxl: CGFloat = 48
}

// MARK: - Radii

enum Radii {
    static let sm: CGFloat = 12
    static let md: CGFloat = 18
    static let lg: CGFloat = 24
    static let pill: CGFloat = 999
}

// MARK: - Fonts

extension Font {
    static func sora(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        switch weight {
        case .bold:
            return .custom("Sora-Bold", size: size)
        case .semibold:
            return .custom("Sora-SemiBold", size: size)
        case .medium:
            return .custom("Sora-Medium", size: size)
        default:
            return .custom("Sora-Regular", size: size)
        }
    }

    static func workSans(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        switch weight {
        case .bold:
            return .custom("WorkSans-Bold", size: size)
        case .semibold:
            return .custom("WorkSans-SemiBold", size: size)
        case .medium:
            return .custom("WorkSans-Medium", size: size)
        default:
            return .custom("WorkSans-Regular", size: size)
        }
    }

    // Semantic aliases
    static let headingLarge = sora(28, weight: .bold)
    static let headingMedium = sora(22, weight: .bold)
    static let headingSmall = sora(18, weight: .semibold)
    static let bodyLarge = workSans(16, weight: .regular)
    static let bodyMedium = workSans(14, weight: .regular)
    static let bodySmall = workSans(12, weight: .regular)
    static let labelMedium = workSans(14, weight: .medium)
    static let labelSmall = workSans(12, weight: .medium)
}
