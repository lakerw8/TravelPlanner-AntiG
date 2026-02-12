import SwiftUI

struct CreateTripSheet: View {
    @Bindable var viewModel: TripsListViewModel
    let userId: String
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Trip name", text: $viewModel.newTripTitle)
                        .font(.bodyLarge)
                    TextField("Destination", text: $viewModel.newTripDestination)
                        .font(.bodyLarge)
                }

                Section("Dates") {
                    DatePicker("Start", selection: $viewModel.newTripStartDate, displayedComponents: .date)
                        .font(.bodyLarge)
                    DatePicker("End", selection: $viewModel.newTripEndDate, in: viewModel.newTripStartDate..., displayedComponents: .date)
                        .font(.bodyLarge)
                }

                if let error = viewModel.errorMessage {
                    Section {
                        Text(error)
                            .font(.bodySmall)
                            .foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle("New Trip")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        viewModel.resetForm()
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") {
                        Task {
                            await viewModel.createTrip(userId: userId)
                        }
                    }
                    .disabled(viewModel.newTripTitle.isEmpty || viewModel.newTripDestination.isEmpty || viewModel.isCreating)
                }
            }
            .overlay {
                if viewModel.isCreating {
                    Color.black.opacity(0.1)
                        .ignoresSafeArea()
                        .overlay { ProgressView() }
                }
            }
        }
    }
}
