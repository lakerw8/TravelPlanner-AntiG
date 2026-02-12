import Foundation

// MARK: - Database Row (matches Supabase `itinerary_items` table)

struct ItineraryItemRow: Codable {
    let id: String?
    let tripId: String
    let placeId: String
    let dayIndex: Int
    let orderIndex: Int?
    let startTime: String?
    let endTime: String?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case id
        case tripId = "trip_id"
        case placeId = "place_id"
        case dayIndex = "day_index"
        case orderIndex = "order_index"
        case startTime = "start_time"
        case endTime = "end_time"
        case notes
    }
}

// MARK: - Insert payload

struct ItineraryItemInsert: Codable {
    let tripId: String
    let placeId: String
    let dayIndex: Int
    let orderIndex: Int
    let startTime: String?
    let endTime: String?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case tripId = "trip_id"
        case placeId = "place_id"
        case dayIndex = "day_index"
        case orderIndex = "order_index"
        case startTime = "start_time"
        case endTime = "end_time"
        case notes
    }
}

// MARK: - App-level model

struct ItineraryItem: Identifiable, Hashable {
    let id: String
    let place: Place
    let dayIndex: Int
    let orderIndex: Int
    let startTime: String?
    let endTime: String?
    let notes: String?

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    static func == (lhs: ItineraryItem, rhs: ItineraryItem) -> Bool {
        lhs.id == rhs.id
    }
}

// MARK: - Trip Day

struct TripDay: Identifiable {
    let date: Date
    let dayIndex: Int
    var items: [ItineraryItem]

    var id: Int { dayIndex }

    var dayLabel: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE"
        return formatter.string(from: date)
    }

    var dayNumber: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "d"
        return formatter.string(from: date)
    }

    var monthLabel: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM"
        return formatter.string(from: date)
    }
}
