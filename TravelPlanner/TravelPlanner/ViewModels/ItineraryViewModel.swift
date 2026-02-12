import Foundation

@Observable
final class ItineraryViewModel {
    var trip: TripSummary
    var days: [TripDay] = []
    var selectedDayIndex = 0
    var isLoading = false
    var errorMessage: String?
    var showPlaceSearch = false

    var currentDay: TripDay? {
        days.first { $0.dayIndex == selectedDayIndex }
    }

    var currentItems: [ItineraryItem] {
        currentDay?.items ?? []
    }

    init(trip: TripSummary) {
        self.trip = trip
    }

    func loadItinerary() async {
        isLoading = true
        errorMessage = nil
        do {
            let fetched = try await ItineraryService.fetchTripDetail(trip: trip)
            await MainActor.run {
                self.days = fetched
                self.isLoading = false
            }
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
                self.isLoading = false
            }
        }
    }

    func addPlace(placeId: String) async {
        errorMessage = nil
        do {
            _ = try await ItineraryService.addToItinerary(
                tripId: trip.id,
                placeId: placeId,
                dayIndex: selectedDayIndex
            )
            await loadItinerary()
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
            }
        }
    }

    func removeItem(_ item: ItineraryItem) async {
        errorMessage = nil
        do {
            try await ItineraryService.removeFromItinerary(itemId: item.id)
            await MainActor.run {
                if let dayIdx = self.days.firstIndex(where: { $0.dayIndex == item.dayIndex }) {
                    self.days[dayIdx].items.removeAll { $0.id == item.id }
                }
            }
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
            }
        }
    }
}
