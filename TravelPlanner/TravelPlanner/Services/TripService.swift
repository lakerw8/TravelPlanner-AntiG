import Foundation
import PostgREST
import Supabase

enum TripServiceError: LocalizedError {
    case geocodingFailed
    case createFailed(String)
    case fetchFailed(String)

    var errorDescription: String? {
        switch self {
        case .geocodingFailed: return "Failed to geocode destination"
        case .createFailed(let msg): return "Failed to create trip: \(msg)"
        case .fetchFailed(let msg): return "Failed to fetch trips: \(msg)"
        }
    }
}

enum TripService {
    private static let googleApiKey = Secrets.googleApiKey

    // MARK: - Fetch all trips for user

    static func fetchTrips(userId: String) async throws -> [TripSummary] {
        let rows: [TripRow] = try await supabase
            .from("trips")
            .select()
            .eq("user_id", value: userId)
            .order("start_date", ascending: true)
            .execute()
            .value
        return rows.compactMap { $0.toSummary() }
    }

    // MARK: - Create trip

    static func createTrip(
        title: String,
        destination: String,
        startDate: Date,
        endDate: Date,
        userId: String
    ) async throws -> TripSummary {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"

        // Geocode destination
        let coords = try? await geocode(destination: destination)

        let insert = TripInsert(
            userId: userId,
            title: title,
            destination: destination,
            startDate: dateFormatter.string(from: startDate),
            endDate: dateFormatter.string(from: endDate),
            coverImage: nil,
            lat: coords?.lat,
            lng: coords?.lng
        )

        let row: TripRow = try await supabase
            .from("trips")
            .insert(insert)
            .select()
            .single()
            .execute()
            .value

        guard let summary = row.toSummary() else {
            throw TripServiceError.createFailed("Invalid response")
        }
        return summary
    }

    // MARK: - Geocoding

    struct GeoResult: Codable {
        let results: [GeoEntry]
        let status: String

        struct GeoEntry: Codable {
            let geometry: Geometry

            struct Geometry: Codable {
                let location: Location

                struct Location: Codable {
                    let lat: Double
                    let lng: Double
                }
            }
        }
    }

    static func geocode(destination: String) async throws -> (lat: Double, lng: Double) {
        let encoded = destination.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? destination
        let urlString = "https://maps.googleapis.com/maps/api/geocode/json?address=\(encoded)&key=\(googleApiKey)"
        guard let url = URL(string: urlString) else { throw TripServiceError.geocodingFailed }

        let (data, _) = try await URLSession.shared.data(from: url)
        let result = try JSONDecoder().decode(GeoResult.self, from: data)

        guard let first = result.results.first else { throw TripServiceError.geocodingFailed }
        return (first.geometry.location.lat, first.geometry.location.lng)
    }
}
