import { NextResponse } from "next/server";

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const BASE_URL = "https://places.googleapis.com/v1/places:autocomplete";

interface PlacesAutocompletePrediction {
    placeId?: string;
    text?: {
        text?: string;
    };
    structuredFormat?: {
        mainText?: {
            text?: string;
        };
        secondaryText?: {
            text?: string;
        };
    };
    types?: string[];
}

interface PlacesAutocompleteSuggestion {
    placePrediction?: PlacesAutocompletePrediction;
}

interface PlacesAutocompleteResponse {
    suggestions?: PlacesAutocompleteSuggestion[];
}

// OpenStreetMap Nominatim Fallback search helper
async function searchNominatim(input: string, location: string | null, radius: string | null) {
    let url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(input)}&format=json&limit=10&addressdetails=1`;
    
    if (location && radius) {
        const [latRaw, lngRaw] = location.split(",");
        const lat = Number(latRaw);
        const lng = Number(lngRaw);
        const radiusMeters = Number(radius) || 50000;
        
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
            // Approx 111km per degree latitude
            const radiusDeg = radiusMeters / 111000;
            const minLat = lat - radiusDeg;
            const maxLat = lat + radiusDeg;
            
            // Adjust longitude degrees for cosine of latitude
            const cosLat = Math.cos((lat * Math.PI) / 180);
            const factor = cosLat > 0.01 ? cosLat : 1;
            const minLng = lng - (radiusDeg / factor);
            const maxLng = lng + (radiusDeg / factor);
            
            // Nominatim viewbox is left,top,right,bottom (minLon, maxLat, maxLon, minLat)
            url += `&viewbox=${minLng},${maxLat},${maxLng},${minLat}&bounded=1`;
        }
    }

    try {
        const res = await fetch(url, {
            headers: {
                "User-Agent": "WanderlustTravelPlanner/1.0"
            }
        });
        if (!res.ok) return null;
        
        const items = await res.json() as any[];
        
        const predictions = items.map((item) => {
            const parts = item.display_name.split(",");
            const mainText = parts[0]?.trim() || "Unknown place";
            const secondaryText = parts.slice(1).join(",").trim();
            
            const osmClass = item.class || "";
            const osmType = item.type || "";
            const types = [osmClass, osmType].filter(Boolean);
            
            const typeAbbrev = item.osm_type || "node";
            
            return {
                place_id: `osm-${typeAbbrev}-${item.osm_id}`,
                types: types,
                structured_formatting: {
                    main_text: mainText,
                    secondary_text: secondaryText,
                },
            };
        });
        
        return predictions;
    } catch (e) {
        console.error("Nominatim fetch failed:", e);
        return null;
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const input = searchParams.get("input");
    const location = searchParams.get("location"); // lat,lng
    const radius = searchParams.get("radius");

    if (!input) {
        return NextResponse.json({ error: "Input is required" }, { status: 400 });
    }

    // If Google API Key is missing, directly fallback to Nominatim
    if (!GOOGLE_API_KEY) {
        const osmPredictions = await searchNominatim(input, location, radius);
        if (osmPredictions) {
            return NextResponse.json({ predictions: osmPredictions });
        }
        return NextResponse.json({ error: "Server API Key not configured and fallback search failed" }, { status: 500 });
    }

    const body: Record<string, unknown> = {
        input,
        includeQueryPredictions: false,
    };

    if (location && radius) {
        const [latRaw, lngRaw] = location.split(",");
        const lat = Number(latRaw);
        const lng = Number(lngRaw);
        const radiusMeters = Number(radius);

        if (
            Number.isFinite(lat) &&
            Number.isFinite(lng) &&
            Number.isFinite(radiusMeters) &&
            radiusMeters > 0
        ) {
            // Strict locationRestriction as requested by user to scope results around the trip context
            body.locationRestriction = {
                circle: {
                    center: {
                        latitude: lat,
                        longitude: lng,
                    },
                    radius: radiusMeters,
                },
            };
        }
    }

    try {
        const res = await fetch(BASE_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": GOOGLE_API_KEY,
                "X-Goog-FieldMask": [
                    "suggestions.placePrediction.placeId",
                    "suggestions.placePrediction.text.text",
                    "suggestions.placePrediction.structuredFormat.mainText.text",
                    "suggestions.placePrediction.structuredFormat.secondaryText.text",
                    "suggestions.placePrediction.types",
                ].join(","),
            },
            body: JSON.stringify(body),
        });
        
        // Catch restricted/rate-limited errors and fallback
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            console.warn("Google autocomplete failed, falling back to Nominatim. Error:", data);
            
            const osmPredictions = await searchNominatim(input, location, radius);
            if (osmPredictions) {
                return NextResponse.json({ predictions: osmPredictions });
            }
            
            return NextResponse.json(
                { error: "Google API error and fallback search failed" },
                { status: res.status }
            );
        }

        const data = await res.json() as PlacesAutocompleteResponse;
        const predictions = (data.suggestions ?? [])
            .map((suggestion) => suggestion.placePrediction)
            .filter((prediction): prediction is PlacesAutocompletePrediction => Boolean(prediction?.placeId))
            .map((prediction) => ({
                place_id: prediction.placeId,
                types: prediction.types ?? [],
                structured_formatting: {
                    main_text: prediction.structuredFormat?.mainText?.text ?? prediction.text?.text ?? "Unknown place",
                    secondary_text: prediction.structuredFormat?.secondaryText?.text ?? "",
                },
            }));

        return NextResponse.json({ predictions });
    } catch (e) {
        console.warn("Google Autocomplete exception, falling back to Nominatim:", e);
        const osmPredictions = await searchNominatim(input, location, radius);
        if (osmPredictions) {
            return NextResponse.json({ predictions: osmPredictions });
        }
        return NextResponse.json({ error: "Failed to fetch from Google and fallback search failed" }, { status: 500 });
    }
}
