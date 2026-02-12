import Foundation

@Observable
final class TripsListViewModel {
    var trips: [TripSummary] = []
    var isLoading = false
    var errorMessage: String?
    var showCreateSheet = false

    // Create trip form state
    var newTripTitle = ""
    var newTripDestination = ""
    var newTripStartDate = Date()
    var newTripEndDate = Calendar.current.date(byAdding: .day, value: 3, to: Date()) ?? Date()
    var isCreating = false

    func fetchTrips(userId: String) async {
        isLoading = true
        errorMessage = nil
        do {
            let fetched = try await TripService.fetchTrips(userId: userId)
            await MainActor.run {
                self.trips = fetched
                self.isLoading = false
            }
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
                self.isLoading = false
            }
        }
    }

    func createTrip(userId: String) async {
        guard !newTripTitle.isEmpty, !newTripDestination.isEmpty else { return }
        isCreating = true
        errorMessage = nil
        do {
            let trip = try await TripService.createTrip(
                title: newTripTitle,
                destination: newTripDestination,
                startDate: newTripStartDate,
                endDate: newTripEndDate,
                userId: userId
            )
            await MainActor.run {
                self.trips.append(trip)
                self.trips.sort { $0.startDate < $1.startDate }
                self.resetForm()
                self.showCreateSheet = false
                self.isCreating = false
            }
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
                self.isCreating = false
            }
        }
    }

    func resetForm() {
        newTripTitle = ""
        newTripDestination = ""
        newTripStartDate = Date()
        newTripEndDate = Calendar.current.date(byAdding: .day, value: 3, to: Date()) ?? Date()
    }
}
