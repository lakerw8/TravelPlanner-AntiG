import SwiftUI
import Combine

struct PlaceSearchSheet: View {
    let viewModel: ItineraryViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var searchText = ""
    @State private var predictions: [AutocompletePrediction] = []
    @State private var isSearching = false
    @State private var isAdding = false
    @State private var errorMessage: String?
    @State private var searchTask: Task<Void, Never>?

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search bar
                HStack(spacing: Spacing.xs) {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(Color.appMuted)
                    TextField("Search for a place...", text: $searchText)
                        .font(.bodyLarge)
                        .textFieldStyle(.plain)
                        .autocorrectionDisabled()
                    if !searchText.isEmpty {
                        Button {
                            searchText = ""
                            predictions = []
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundStyle(Color.appMuted)
                        }
                    }
                }
                .padding(Spacing.sm)
                .background(Color.appSurface)
                .clipShape(RoundedRectangle(cornerRadius: Radii.sm))
                .padding(.horizontal, Spacing.md)
                .padding(.top, Spacing.sm)

                // Results
                if isAdding {
                    VStack(spacing: Spacing.sm) {
                        ProgressView()
                        Text("Adding place...")
                            .font(.bodyMedium)
                            .foregroundStyle(Color.appMuted)
                    }
                    .frame(maxHeight: .infinity)
                } else if isSearching && predictions.isEmpty {
                    ProgressView()
                        .padding(.top, Spacing.xxl)
                    Spacer()
                } else {
                    List(predictions) { prediction in
                        Button {
                            Task { await selectPlace(prediction) }
                        } label: {
                            VStack(alignment: .leading, spacing: Spacing.xxxs) {
                                Text(prediction.mainText)
                                    .font(.labelMedium)
                                    .foregroundStyle(Color.appText)
                                Text(prediction.secondaryText)
                                    .font(.bodySmall)
                                    .foregroundStyle(Color.appMuted)
                                    .lineLimit(1)
                            }
                            .padding(.vertical, Spacing.xxs)
                        }
                        .listRowBackground(Color.appBackground)
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
                }

                if let error = errorMessage {
                    Text(error)
                        .font(.bodySmall)
                        .foregroundStyle(.red)
                        .padding(Spacing.sm)
                }
            }
            .background(Color.appBackground)
            .navigationTitle("Add Place")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .onChange(of: searchText) { _, newValue in
                debounceSearch(query: newValue)
            }
        }
    }

    private func debounceSearch(query: String) {
        searchTask?.cancel()
        guard query.count >= 2 else {
            predictions = []
            return
        }
        searchTask = Task {
            try? await Task.sleep(for: .milliseconds(300))
            guard !Task.isCancelled else { return }
            await performSearch(query: query)
        }
    }

    private func performSearch(query: String) async {
        isSearching = true
        do {
            let results = try await GooglePlacesService.autocomplete(
                input: query,
                lat: viewModel.trip.lat,
                lng: viewModel.trip.lng
            )
            await MainActor.run {
                self.predictions = results
                self.isSearching = false
            }
        } catch {
            await MainActor.run {
                self.isSearching = false
            }
        }
    }

    private func selectPlace(_ prediction: AutocompletePrediction) async {
        isAdding = true
        errorMessage = nil
        do {
            // Fetch place details from Google
            let placeInsert = try await GooglePlacesService.getDetails(placeId: prediction.placeId)
            // Upsert into Supabase places table
            let placeRow = try await GooglePlacesService.upsertPlace(placeInsert)
            let place = placeRow.toPlace()
            // Add to itinerary
            await viewModel.addPlace(placeId: place.id)
            await MainActor.run {
                dismiss()
            }
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
                self.isAdding = false
            }
        }
    }
}
