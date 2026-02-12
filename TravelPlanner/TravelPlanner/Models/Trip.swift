import Foundation

// MARK: - Database Row (matches Supabase `trips` table)

struct TripRow: Codable {
    let id: String
    let userId: String
    let title: String
    let destination: String
    let startDate: String
    let endDate: String
    let coverImage: String?
    let lat: Double?
    let lng: Double?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case title
        case destination
        case startDate = "start_date"
        case endDate = "end_date"
        case coverImage = "cover_image"
        case lat
        case lng
    }
}

// MARK: - Insert payload

struct TripInsert: Codable {
    let userId: String
    let title: String
    let destination: String
    let startDate: String
    let endDate: String
    let coverImage: String?
    let lat: Double?
    let lng: Double?

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case title
        case destination
        case startDate = "start_date"
        case endDate = "end_date"
        case coverImage = "cover_image"
        case lat
        case lng
    }
}

// MARK: - App-level model

struct TripSummary: Identifiable, Hashable {
    let id: String
    let title: String
    let destination: String
    let startDate: Date
    let endDate: Date
    let coverImage: String?
    let lat: Double?
    let lng: Double?

    var dateRangeText: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        let start = formatter.string(from: startDate)
        let end = formatter.string(from: endDate)
        return "\(start) – \(end)"
    }

    var dayCount: Int {
        let calendar = Calendar.current
        let components = calendar.dateComponents([.day], from: startDate, to: endDate)
        return (components.day ?? 0) + 1
    }
}

// MARK: - Mapping

extension TripRow {
    func toSummary() -> TripSummary? {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        guard let start = formatter.date(from: startDate),
              let end = formatter.date(from: endDate) else { return nil }
        return TripSummary(
            id: id,
            title: title,
            destination: destination,
            startDate: start,
            endDate: end,
            coverImage: coverImage,
            lat: lat,
            lng: lng
        )
    }
}
