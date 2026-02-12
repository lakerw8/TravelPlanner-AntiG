import SwiftUI

struct TripCardView: View {
    let trip: TripSummary
    var onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 0) {
                // Cover image
                ZStack(alignment: .bottomLeading) {
                    if let coverUrl = trip.coverImage, let url = URL(string: coverUrl) {
                        AsyncImage(url: url) { phase in
                            switch phase {
                            case .success(let image):
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                            default:
                                coverPlaceholder
                            }
                        }
                    } else {
                        coverPlaceholder
                    }
                }
                .frame(height: 140)
                .clipped()

                // Info
                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text(trip.title)
                        .font(.headingSmall)
                        .foregroundStyle(Color.appText)
                        .lineLimit(1)

                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "mappin.circle.fill")
                            .font(.bodySmall)
                            .foregroundStyle(Color.appMuted)
                        Text(trip.destination)
                            .font(.bodyMedium)
                            .foregroundStyle(Color.appMuted)
                            .lineLimit(1)
                    }

                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "calendar")
                            .font(.bodySmall)
                            .foregroundStyle(Color.appMuted)
                        Text(trip.dateRangeText)
                            .font(.bodySmall)
                            .foregroundStyle(Color.appMuted)

                        TagPill(text: "\(trip.dayCount) days", tone: .mint)
                    }
                }
                .padding(Spacing.sm)
            }
            .background(Color.appCard)
            .clipShape(RoundedRectangle(cornerRadius: Radii.md))
            .overlay(
                RoundedRectangle(cornerRadius: Radii.md)
                    .stroke(Color.appOutline.opacity(0.08), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    private var coverPlaceholder: some View {
        Rectangle()
            .fill(
                LinearGradient(
                    colors: [Color.appMint.opacity(0.3), Color.appLavender.opacity(0.3)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .overlay {
                Image(systemName: "airplane")
                    .font(.system(size: 32))
                    .foregroundStyle(Color.appMuted.opacity(0.3))
            }
    }
}
