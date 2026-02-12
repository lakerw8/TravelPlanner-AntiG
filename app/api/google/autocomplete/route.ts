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

export async function GET(request: Request) {
    if (!GOOGLE_API_KEY) {
        return NextResponse.json({ error: "Server API Key not configured" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const input = searchParams.get("input");
    const location = searchParams.get("location"); // lat,lng
    const radius = searchParams.get("radius");

    if (!input) {
        return NextResponse.json({ error: "Input is required" }, { status: 400 });
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
            body.locationBias = {
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
        const data = await res.json() as PlacesAutocompleteResponse & { error?: { message?: string } };

        if (!res.ok) {
            console.error("Google Places Autocomplete Error:", data);
            return NextResponse.json(
                { error: data.error?.message || "Google Places API Error" },
                { status: res.status }
            );
        }

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
    } catch {
        return NextResponse.json({ error: "Failed to fetch from Google" }, { status: 500 });
    }
}
