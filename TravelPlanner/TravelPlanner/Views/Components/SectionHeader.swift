import SwiftUI

struct SectionHeader: View {
    let title: String
    var action: String?
    var onAction: (() -> Void)?

    var body: some View {
        HStack {
            Text(title)
                .font(.headingSmall)
                .foregroundStyle(Color.appText)
            Spacer()
            if let action, let onAction {
                Button(action, action: onAction)
                    .font(.labelMedium)
                    .foregroundStyle(Color.appMuted)
            }
        }
    }
}
