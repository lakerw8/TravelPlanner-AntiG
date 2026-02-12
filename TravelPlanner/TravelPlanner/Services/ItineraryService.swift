import Foundation
import PostgREST
import Supabase

enum ItineraryServiceError: LocalizedError {
    case fetchFailed(String)
    case addFailed(String)
    case removeFailed(String)

    var errorDescription: String? {
        switch self {
        case .fetchFailed(let msg): return "Failed to fetch itinerary: \(msg)"
        case .addFailed(let msg): return "Failed to add item: \(msg)"
        case .removeFailed(let msg): return "Failed to remove item: \(msg)"
        }
    }
}

enum ItineraryService {

    // MARK: - Fetch trip detail with itinerary

    static func fetchTripDetail(trip: TripSummary) async throws -> [TripDay] {
        // Fetch places and itinerary items in parallel
        async let placesTask: [PlaceRow] = supabase
            .from("places")
            .select("*, itinerary_items!inner(trip_id)")
            .eq("itinerary_items.trip_id", value: trip.id)
            .execute()
            .value

        async let itemsTask: [ItineraryItemRow] = supabase
            .from("itinerary_items")
            .select()
            .eq("trip_id", value: trip.id)
            .order("order_index", ascending: true)
            .execute()
            .value

        let (placeRows, itemRows) = try await (placesTask, itemsTask)

        // Build place lookup
        var placesById: [String: Place] = [:]
        for row in placeRows {
            let place = row.toPlace()
            placesById[place.id] = place
        }

        // Build itinerary items
        var itemsByDay: [Int: [ItineraryItem]] = [:]
        for row in itemRows {
            guard let place = placesById[row.placeId] else { continue }
            let item = ItineraryItem(
                id: row.id ?? UUID().uuidString,
                place: place,
                dayIndex: row.dayIndex,
                orderIndex: row.orderIndex ?? 0,
                startTime: row.startTime,
                endTime: row.endTime,
                notes: row.notes
            )
            itemsByDay[row.dayIndex, default: []].append(item)
        }

        // Build TripDay array for each day of the trip
        let calendar = Calendar.current
        var days: [TripDay] = []
        for dayIndex in 0..<trip.dayCount {
            guard let date = calendar.date(byAdding: .day, value: dayIndex, to: trip.startDate) else { continue }
            let items = (itemsByDay[dayIndex] ?? []).sorted { $0.orderIndex < $1.orderIndex }
            days.append(TripDay(date: date, dayIndex: dayIndex, items: items))
        }

        return days
    }

    // MARK: - Add place to itinerary

    static func addToItinerary(
        tripId: String,
        placeId: String,
        dayIndex: Int
    ) async throws -> ItineraryItemRow {
        // Get current max order_index for this day
        let existing: [ItineraryItemRow] = try await supabase
            .from("itinerary_items")
            .select()
            .eq("trip_id", value: tripId)
            .eq("day_index", value: dayIndex)
            .order("order_index", ascending: false)
            .limit(1)
            .execute()
            .value

        let nextOrder = (existing.first?.orderIndex ?? -1) + 1

        let insert = ItineraryItemInsert(
            tripId: tripId,
            placeId: placeId,
            dayIndex: dayIndex,
            orderIndex: nextOrder,
            startTime: nil,
            endTime: nil,
            notes: nil
        )

        let row: ItineraryItemRow = try await supabase
            .from("itinerary_items")
            .insert(insert)
            .select()
            .single()
            .execute()
            .value

        return row
    }

    // MARK: - Remove from itinerary

    static func removeFromItinerary(itemId: String) async throws {
        try await supabase
            .from("itinerary_items")
            .delete()
            .eq("id", value: itemId)
            .execute()
    }
}
