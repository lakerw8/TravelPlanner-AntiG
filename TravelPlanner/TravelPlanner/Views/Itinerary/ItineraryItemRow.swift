import SwiftUI

struct ItineraryItemRowView: View {
    let item: ItineraryItem
    let onRemove: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: Spacing.sm) {
            // Time column
            VStack(alignment: .trailing, spacing: Spacing.xxxs) {
                if let start = item.startTime {
                    Text(start)
                        .font(.labelSmall)
                        .foregroundStyle(Color.appText)
                }
                if let end = item.endTime {
                    Text(end)
                        .font(.labelSmall)
                        .foregroundStyle(Color.appMuted)
                }
            }
            .frame(width: 50, alignment: .trailing)

            // Divider line
            Rectangle()
                .fill(Color.appMint)
                .frame(width: 3)
                .clipShape(Capsule())

            // Content
            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(item.place.name)
                    .font(.labelMedium)
                    .foregroundStyle(Color.appText)
                    .lineLimit(1)

                if let address = item.place.address {
                    Text(address)
                        .font(.bodySmall)
                        .foregroundStyle(Color.appMuted)
                        .lineLimit(1)
                }

                if let notes = item.notes, !notes.isEmpty {
                    Text(notes)
                        .font(.bodySmall)
                        .foregroundStyle(Color.appMuted)
                        .italic()
                        .lineLimit(2)
                }

                TagPill(text: item.place.type.label, tone: pillTone(for: item.place.type))
            }

            Spacer()

            // Remove button
            Button(action: onRemove) {
                Image(systemName: "xmark.circle.fill")
                    .foregroundStyle(Color.appMuted.opacity(0.4))
            }
            .buttonStyle(.plain)
        }
        .padding(Spacing.sm)
        .background(Color.appCard)
        .clipShape(RoundedRectangle(cornerRadius: Radii.sm))
    }

    private func pillTone(for type: PlaceType) -> PillTone {
        switch type {
        case .restaurant, .cafe, .bar: return .yellow
        case .lodging: return .lavender
        case .attraction, .activity: return .mint
        default: return .surface
        }
    }
}
