import Foundation

// MARK: - Place type

enum PlaceType: String, Codable, CaseIterable {
    case restaurant
    case activity
    case lodging
    case flight
    case attraction
    case cafe
    case bar
    case shopping
    case other

    var label: String {
        rawValue.capitalized
    }
}

// MARK: - Database Row (matches Supabase `places` table)

struct PlaceRow: Codable {
    let id: String?
    let googlePlaceId: String?
    let name: String
    let address: String?
    let rating: Double?
    let type: String?
    let image: String?
    let lat: Double?
    let lng: Double?
    let city: String?
    let openingHours: [String]?
    let details: PlaceDetails?

    enum CodingKeys: String, CodingKey {
        case id
        case googlePlaceId = "google_place_id"
        case name
        case address
        case rating
        case type
        case image
        case lat
        case lng
        case city
        case openingHours = "opening_hours"
        case details
    }
}

struct PlaceDetails: Codable {
    let editorialSummary: String?
    let formattedPhoneNumber: String?
    let typicalVisitDurationMinutes: Int?

    enum CodingKeys: String, CodingKey {
        case editorialSummary = "editorial_summary"
        case formattedPhoneNumber = "formatted_phone_number"
        case typicalVisitDurationMinutes = "typical_visit_duration_minutes"
    }
}

// MARK: - Insert payload (for upserting places)

struct PlaceInsert: Codable {
    let googlePlaceId: String
    let name: String
    let address: String?
    let rating: Double?
    let type: String?
    let image: String?
    let lat: Double?
    let lng: Double?
    let city: String?
    let openingHours: [String]?
    let details: PlaceDetails?

    enum CodingKeys: String, CodingKey {
        case googlePlaceId = "google_place_id"
        case name
        case address
        case rating
        case type
        case image
        case lat
        case lng
        case city
        case openingHours = "opening_hours"
        case details
    }
}

// MARK: - App-level model

struct Place: Identifiable, Hashable {
    let id: String
    let googlePlaceId: String?
    let name: String
    let address: String?
    let rating: Double?
    let type: PlaceType
    let image: String?
    let lat: Double?
    let lng: Double?
    let city: String?
    let openingHours: [String]?
    let editorialSummary: String?

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    static func == (lhs: Place, rhs: Place) -> Bool {
        lhs.id == rhs.id
    }
}

// MARK: - Mapping

extension PlaceRow {
    func toPlace() -> Place {
        Place(
            id: id ?? UUID().uuidString,
            googlePlaceId: googlePlaceId,
            name: name,
            address: address,
            rating: rating,
            type: PlaceType(rawValue: type ?? "other") ?? .other,
            image: image,
            lat: lat,
            lng: lng,
            city: city,
            openingHours: openingHours,
            editorialSummary: details?.editorialSummary
        )
    }
}
