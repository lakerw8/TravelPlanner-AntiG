import Foundation
import PostgREST
import Supabase

enum GooglePlacesError: LocalizedError {
    case requestFailed
    case noResults

    var errorDescription: String? {
        switch self {
        case .requestFailed: return "Place search failed"
        case .noResults: return "No results found"
        }
    }
}

// MARK: - Autocomplete response types

struct AutocompletePrediction: Identifiable, Hashable {
    let placeId: String
    let mainText: String
    let secondaryText: String

    var id: String { placeId }
}

enum GooglePlacesService {
    private static let apiKey = Secrets.googleApiKey

    // MARK: - Autocomplete

    static func autocomplete(input: String, lat: Double? = nil, lng: Double? = nil) async throws -> [AutocompletePrediction] {
        var body: [String: Any] = [
            "input": input,
            "languageCode": "en"
        ]

        if let lat, let lng {
            body["locationBias"] = [
                "circle": [
                    "center": ["latitude": lat, "longitude": lng],
                    "radius": 50000.0
                ]
            ]
        }

        let url = URL(string: "https://places.googleapis.com/v1/places:autocomplete")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(apiKey, forHTTPHeaderField: "X-Goog-Api-Key")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(AutocompleteResponse.self, from: data)

        return (response.suggestions ?? []).compactMap { suggestion in
            guard let prediction = suggestion.placePrediction else { return nil }
            return AutocompletePrediction(
                placeId: prediction.placeId,
                mainText: prediction.structuredFormat.mainText.text,
                secondaryText: prediction.structuredFormat.secondaryText.text
            )
        }
    }

    // MARK: - Place Details

    static func getDetails(placeId: String) async throws -> PlaceInsert {
        let url = URL(string: "https://places.googleapis.com/v1/places/\(placeId)")!
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue(apiKey, forHTTPHeaderField: "X-Goog-Api-Key")
        request.setValue(
            "places.id,places.displayName,places.formattedAddress,places.rating,places.types,places.photos,places.location,places.editorialSummary,places.regularOpeningHours,places.internationalPhoneNumber,places.websiteUri,places.priceLevel",
            forHTTPHeaderField: "X-Goog-FieldMask"
        )

        let (data, _) = try await URLSession.shared.data(for: request)
        let detail = try JSONDecoder().decode(PlaceDetailResponse.self, from: data)

        // Map type from Google types
        let placeType = mapGoogleType(detail.types ?? [])

        // Get photo URL if available
        var photoUrl: String?
        if let photoRef = detail.photos?.first?.name {
            photoUrl = "https://places.googleapis.com/v1/\(photoRef)/media?maxWidthPx=800&key=\(apiKey)"
        }

        // Opening hours strings
        let hours = detail.regularOpeningHours?.weekdayDescriptions

        return PlaceInsert(
            googlePlaceId: placeId,
            name: detail.displayName.text,
            address: detail.formattedAddress,
            rating: detail.rating,
            type: placeType,
            image: photoUrl,
            lat: detail.location?.latitude,
            lng: detail.location?.longitude,
            city: nil,
            openingHours: hours,
            details: PlaceDetails(
                editorialSummary: detail.editorialSummary?.text,
                formattedPhoneNumber: detail.internationalPhoneNumber,
                typicalVisitDurationMinutes: nil
            )
        )
    }

    // MARK: - Upsert place into Supabase

    static func upsertPlace(_ insert: PlaceInsert) async throws -> PlaceRow {
        let row: PlaceRow = try await supabase
            .from("places")
            .upsert(insert, onConflict: "google_place_id")
            .select()
            .single()
            .execute()
            .value
        return row
    }

    // MARK: - Helpers

    private static func mapGoogleType(_ types: [String]) -> String {
        for t in types {
            if t.contains("restaurant") || t.contains("food") { return "restaurant" }
            if t.contains("lodging") || t.contains("hotel") { return "lodging" }
            if t.contains("cafe") || t.contains("coffee") { return "cafe" }
            if t.contains("bar") { return "bar" }
            if t.contains("shopping") || t.contains("store") { return "shopping" }
            if t.contains("museum") || t.contains("park") || t.contains("tourist_attraction") { return "attraction" }
        }
        return "activity"
    }
}

// MARK: - Google API Response Models

private struct AutocompleteResponse: Codable {
    let suggestions: [Suggestion]?

    struct Suggestion: Codable {
        let placePrediction: PlacePrediction?
    }

    struct PlacePrediction: Codable {
        let placeId: String
        let structuredFormat: StructuredFormat
    }

    struct StructuredFormat: Codable {
        let mainText: TextValue
        let secondaryText: TextValue
    }

    struct TextValue: Codable {
        let text: String
    }
}

private struct PlaceDetailResponse: Codable {
    let displayName: DisplayName
    let formattedAddress: String?
    let rating: Double?
    let types: [String]?
    let photos: [Photo]?
    let location: LatLng?
    let editorialSummary: LocalizedText?
    let regularOpeningHours: OpeningHours?
    let internationalPhoneNumber: String?
    let websiteUri: String?
    let priceLevel: String?

    struct DisplayName: Codable {
        let text: String
    }

    struct Photo: Codable {
        let name: String
    }

    struct LatLng: Codable {
        let latitude: Double
        let longitude: Double
    }

    struct LocalizedText: Codable {
        let text: String
    }

    struct OpeningHours: Codable {
        let weekdayDescriptions: [String]?
    }
}
