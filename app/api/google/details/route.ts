import { NextResponse } from "next/server";

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const BASE_URL = "https://places.googleapis.com/v1/places";

interface PlacesAddressComponent {
    longText?: string;
    shortText?: string;
    types?: string[];
}

interface PlacesPhoto {
    name?: string;
}

interface PlacesDetailResponse {
    id?: string;
    displayName?: {
        text?: string;
    };
    formattedAddress?: string;
    location?: {
        latitude?: number;
        longitude?: number;
    };
    types?: string[];
    rating?: number;
    userRatingCount?: number;
    photos?: PlacesPhoto[];
    priceLevel?: string;
    websiteUri?: string;
    internationalPhoneNumber?: string;
    nationalPhoneNumber?: string;
    editorialSummary?: {
        text?: string;
    };
    regularOpeningHours?: {
        weekdayDescriptions?: string[];
    };
    currentOpeningHours?: {
        weekdayDescriptions?: string[];
    };
    addressComponents?: PlacesAddressComponent[];
}

function mapPriceLevelToNumber(priceLevel?: string): number | undefined {
    switch (priceLevel) {
        case "PRICE_LEVEL_FREE":
            return 0;
        case "PRICE_LEVEL_INEXPENSIVE":
            return 1;
        case "PRICE_LEVEL_MODERATE":
            return 2;
        case "PRICE_LEVEL_EXPENSIVE":
            return 3;
        case "PRICE_LEVEL_VERY_EXPENSIVE":
            return 4;
        default:
            return undefined;
    }
}

function mapAddressComponents(components?: PlacesAddressComponent[]) {
    return (components ?? []).map((component) => ({
        long_name: component.longText ?? "",
        short_name: component.shortText ?? "",
        types: component.types ?? [],
    }));
}

// OpenStreetMap Nominatim Fallback details fetch helper
async function fetchOsmDetails(placeId: string) {
    const parts = placeId.split("-");
    const rawType = parts[1] || "node";
    const osmId = parts[2];
    
    if (!osmId) return null;
    
    let typeChar = "N";
    if (rawType.toLowerCase() === "way") typeChar = "W";
    else if (rawType.toLowerCase() === "relation") typeChar = "R";
    
    const url = `https://nominatim.openstreetmap.org/lookup?osm_ids=${typeChar}${osmId}&format=json&addressdetails=1`;
    
    try {
        const res = await fetch(url, {
            headers: {
                "User-Agent": "WanderlustTravelPlanner/1.0"
            }
        });
        if (!res.ok) return null;
        
        const items = await res.json() as any[];
        const item = items[0];
        if (!item) return null;
        
        const parts = item.display_name.split(",");
        const mainText = parts[0]?.trim() || "Unknown place";
        
        const city = item.address?.city || item.address?.town || item.address?.village || item.address?.suburb || "";
        const addressComponents = [];
        if (city) {
            addressComponents.push({
                longText: city,
                shortText: city,
                types: ["locality"]
            });
        }
        
        const rawTypes = [item.class, item.type].filter(Boolean);
        
        const result = {
            place_id: placeId,
            name: mainText,
            formatted_address: item.display_name,
            types: rawTypes,
            rating: 0,
            user_ratings_total: 0,
            photos: [],
            price_level: undefined,
            website: undefined,
            geometry: {
                location: {
                    lat: Number(item.lat),
                    lng: Number(item.lon),
                },
            },
            address_components: addressComponents.map((comp) => ({
                long_name: comp.longText,
                short_name: comp.shortText,
                types: comp.types,
            })),
            editorial_summary: undefined,
            opening_hours: undefined,
            current_opening_hours: undefined,
            formatted_phone_number: undefined,
            international_phone_number: undefined,
        };
        
        return result;
    } catch (e) {
        console.error("OSM lookup details failed:", e);
        return null;
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const placeId = searchParams.get("placeId");
    const languageCode = searchParams.get("languageCode") || "en";

    if (!placeId) {
        return NextResponse.json({ error: "Place ID is required" }, { status: 400 });
    }

    // Intercept OSM Place IDs directly
    if (placeId.startsWith("osm-")) {
        const osmResult = await fetchOsmDetails(placeId);
        if (osmResult) {
            return NextResponse.json({
                status: "OK",
                result: osmResult,
            });
        }
        return NextResponse.json({ error: "Failed to fetch details for OSM place" }, { status: 500 });
    }

    if (!GOOGLE_API_KEY) {
        return NextResponse.json({ error: "Server API Key not configured" }, { status: 500 });
    }

    const normalizedPlaceId = placeId.startsWith("places/")
        ? placeId.slice("places/".length)
        : placeId;
    const url = new URL(`${BASE_URL}/${encodeURIComponent(normalizedPlaceId)}`);
    url.searchParams.set("languageCode", languageCode);

    try {
        const res = await fetch(url.toString(), {
            headers: {
                "X-Goog-Api-Key": GOOGLE_API_KEY,
                "X-Goog-FieldMask": [
                    "id",
                    "displayName",
                    "formattedAddress",
                    "location",
                    "types",
                    "rating",
                    "userRatingCount",
                    "photos",
                    "priceLevel",
                    "websiteUri",
                    "internationalPhoneNumber",
                    "nationalPhoneNumber",
                    "editorialSummary",
                    "regularOpeningHours",
                    "currentOpeningHours",
                    "addressComponents",
                ].join(","),
            },
        });
        const data = await res.json() as PlacesDetailResponse & { error?: { message?: string } };

        if (!res.ok) {
            console.error("Google Places Details Error:", data);
            return NextResponse.json(
                { error: data.error?.message || "Google Places API Error" },
                { status: res.status }
            );
        }

        const result = {
            place_id: data.id ?? placeId,
            name: data.displayName?.text ?? "Unknown place",
            formatted_address: data.formattedAddress,
            types: data.types ?? [],
            rating: data.rating,
            user_ratings_total: data.userRatingCount,
            photos: (data.photos ?? [])
                .filter((photo): photo is PlacesPhoto & { name: string } => Boolean(photo.name))
                .map((photo) => ({ photo_reference: photo.name })),
            price_level: mapPriceLevelToNumber(data.priceLevel),
            website: data.websiteUri,
            geometry: data.location
                ? {
                    location: {
                        lat: data.location.latitude,
                        lng: data.location.longitude,
                    },
                }
                : undefined,
            address_components: mapAddressComponents(data.addressComponents),
            editorial_summary: data.editorialSummary?.text
                ? { overview: data.editorialSummary.text }
                : undefined,
            opening_hours: data.regularOpeningHours?.weekdayDescriptions
                ? { weekday_text: data.regularOpeningHours.weekdayDescriptions }
                : undefined,
            current_opening_hours: data.currentOpeningHours?.weekdayDescriptions
                ? { weekday_text: data.currentOpeningHours.weekdayDescriptions }
                : undefined,
            formatted_phone_number: data.nationalPhoneNumber,
            international_phone_number: data.internationalPhoneNumber,
        };

        return NextResponse.json({
            status: "OK",
            result,
        });
    } catch {
        return NextResponse.json({ error: "Failed to fetch details from Google" }, { status: 500 });
    }
}
