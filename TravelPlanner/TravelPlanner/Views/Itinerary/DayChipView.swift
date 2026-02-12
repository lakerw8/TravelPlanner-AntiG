import SwiftUI

struct DayChipView: View {
    let day: TripDay
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: Spacing.xxxs) {
                Text(day.dayLabel)
                    .font(.labelSmall)
                    .foregroundStyle(isSelected ? Color.appText : Color.appMuted)
                Text(day.dayNumber)
                    .font(.headingSmall)
                    .foregroundStyle(isSelected ? Color.appText : Color.appMuted)
                Text(day.monthLabel)
                    .font(.labelSmall)
                    .foregroundStyle(isSelected ? Color.appText : Color.appMuted)
            }
            .frame(width: 52, height: 72)
            .background(isSelected ? Color.appMint : Color.appSurface)
            .clipShape(RoundedRectangle(cornerRadius: Radii.sm))
            .overlay(
                RoundedRectangle(cornerRadius: Radii.sm)
                    .stroke(isSelected ? Color.appOutline.opacity(0.15) : Color.clear, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}
