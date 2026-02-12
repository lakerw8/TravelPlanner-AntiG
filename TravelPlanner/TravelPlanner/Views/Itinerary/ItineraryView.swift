import SwiftUI

struct ItineraryView: View {
    let trip: TripSummary
    @State private var viewModel: ItineraryViewModel

    init(trip: TripSummary) {
        self.trip = trip
        self._viewModel = State(initialValue: ItineraryViewModel(trip: trip))
    }

    var body: some View {
        VStack(spacing: 0) {
            // Day chips
            if !viewModel.days.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: Spacing.xs) {
                        ForEach(viewModel.days) { day in
                            DayChipView(
                                day: day,
                                isSelected: day.dayIndex == viewModel.selectedDayIndex
                            ) {
                                viewModel.selectedDayIndex = day.dayIndex
                            }
                        }
                    }
                    .padding(.horizontal, Spacing.md)
                    .padding(.vertical, Spacing.sm)
                }
                .background(Color.appSurface)
            }

            // Items list
            ScrollView {
                LazyVStack(spacing: Spacing.xs) {
                    if viewModel.isLoading {
                        ProgressView()
                            .padding(.top, Spacing.xxl)
                    } else if viewModel.currentItems.isEmpty {
                        emptyDayState
                    } else {
                        ForEach(viewModel.currentItems) { item in
                            ItineraryItemRowView(item: item) {
                                Task { await viewModel.removeItem(item) }
                            }
                        }
                    }
                }
                .padding(.horizontal, Spacing.md)
                .padding(.top, Spacing.sm)
                .padding(.bottom, Spacing.xxl)
            }
        }
        .background(Color.appBackground)
        .navigationTitle(trip.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    viewModel.showPlaceSearch = true
                } label: {
                    Image(systemName: "plus.circle.fill")
                        .font(.title3)
                        .foregroundStyle(Color.appText)
                }
            }
        }
        .sheet(isPresented: $viewModel.showPlaceSearch) {
            PlaceSearchSheet(viewModel: viewModel)
        }
        .task {
            await viewModel.loadItinerary()
        }
    }

    private var emptyDayState: some View {
        VStack(spacing: Spacing.sm) {
            Image(systemName: "calendar.badge.plus")
                .font(.system(size: 36))
                .foregroundStyle(Color.appMuted.opacity(0.4))
            Text("No activities for this day")
                .font(.bodyMedium)
                .foregroundStyle(Color.appMuted)
            PrimaryButton(title: "Add a Place", tone: .mint) {
                viewModel.showPlaceSearch = true
            }
            .frame(width: 180)
        }
        .padding(.top, Spacing.xxl)
    }
}
