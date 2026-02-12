import SwiftUI

struct TripsListView: View {
    let authVM: AuthViewModel
    @State private var viewModel = TripsListViewModel()
    @State private var selectedTrip: TripSummary?

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: Spacing.md) {
                    if viewModel.isLoading && viewModel.trips.isEmpty {
                        ProgressView()
                            .padding(.top, Spacing.xxl)
                    } else if viewModel.trips.isEmpty {
                        emptyState
                    } else {
                        ForEach(viewModel.trips) { trip in
                            TripCardView(trip: trip) {
                                selectedTrip = trip
                            }
                        }
                    }
                }
                .padding(.horizontal, Spacing.md)
                .padding(.top, Spacing.sm)
            }
            .background(Color.appBackground)
            .navigationTitle("My Trips")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        Task { await authVM.signOut() }
                    } label: {
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                            .foregroundStyle(Color.appMuted)
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        viewModel.showCreateSheet = true
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.title3)
                            .foregroundStyle(Color.appText)
                    }
                }
            }
            .refreshable {
                if let userId = authVM.userId {
                    await viewModel.fetchTrips(userId: userId)
                }
            }
            .sheet(isPresented: $viewModel.showCreateSheet) {
                CreateTripSheet(viewModel: viewModel, userId: authVM.userId ?? "")
            }
            .navigationDestination(item: $selectedTrip) { trip in
                ItineraryView(trip: trip)
            }
            .task {
                if let userId = authVM.userId {
                    await viewModel.fetchTrips(userId: userId)
                }
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: Spacing.md) {
            Image(systemName: "airplane.departure")
                .font(.system(size: 48))
                .foregroundStyle(Color.appMuted.opacity(0.4))
            Text("No trips yet")
                .font(.headingSmall)
                .foregroundStyle(Color.appMuted)
            Text("Tap + to plan your first adventure")
                .font(.bodyMedium)
                .foregroundStyle(Color.appMuted.opacity(0.7))
        }
        .padding(.top, Spacing.xxl * 2)
    }
}
