"use client";

import { Search, MapPin, Loader2, X } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Place, PlaceType } from "@/lib/types";

interface PlaceAutocompleteProps {
    onSelect: (place: Place) => void;
    tripLocation?: { lat: number; lng: number };
    placeholder?: string;
    className?: string;
}

interface GoogleAutocompletePrediction {
    place_id: string;
    types?: string[];
    structured_formatting?: {
        main_text?: string;
        secondary_text?: string;
    };
}

interface GoogleAutocompleteResponse {
    predictions?: GoogleAutocompletePrediction[];
}

interface GoogleAddressComponent {
    long_name: string;
    types: string[];
}

interface GooglePlaceDetailsResult {
    place_id: string;
    name: string;
    formatted_address?: string;
    types?: string[];
    rating?: number;
    user_ratings_total?: number;
    photos?: Array<{ photo_reference: string }>;
    price_level?: number;
    website?: string;
    geometry?: { location?: { lat?: number; lng?: number } };
    address_components?: GoogleAddressComponent[];
    editorial_summary?: { overview?: string };
    opening_hours?: { weekday_text?: string[] };
    current_opening_hours?: { weekday_text?: string[] };
    formatted_phone_number?: string;
    international_phone_number?: string;
    [key: string]: unknown;
}

interface GooglePlaceDetailsResponse {
    result?: GooglePlaceDetailsResult;
}

function mapGoogleType(types: string[] = []): PlaceType {
    if (types.includes("lodging")) return "lodging";
    if (types.includes("restaurant") || types.includes("food")) return "restaurant";
    if (types.includes("airport")) return "flight";
    return "activity";
}

function extractCity(components: GoogleAddressComponent[] = []): string {
    const city = components.find((component) => component.types.includes("locality"))?.long_name;
    return city || "";
}

function parseDurationTextToMinutes(value: string): number | undefined {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return undefined;

    const isoMatch = normalized.match(/^pt(?:(\d+)h)?(?:(\d+)m)?$/i);
    if (isoMatch) {
        const hours = Number(isoMatch[1] || 0);
        const minutes = Number(isoMatch[2] || 0);
        const total = hours * 60 + minutes;
        return total > 0 ? total : undefined;
    }

    const hourMinMatch = normalized.match(/(\d+)\s*h(?:ours?)?\s*(\d+)\s*m(?:in(?:ute)?s?)?/);
    if (hourMinMatch) {
        return Number(hourMinMatch[1]) * 60 + Number(hourMinMatch[2]);
    }

    const hourMatch = normalized.match(/(\d+(?:\.\d+)?)\s*h(?:our)?s?/);
    if (hourMatch) {
        return Math.round(Number(hourMatch[1]) * 60);
    }

    const minMatch = normalized.match(/(\d+)\s*m(?:in(?:ute)?s?)?/);
    if (minMatch) {
        return Number(minMatch[1]);
    }

    return undefined;
}

function extractTypicalVisitDurationMinutes(result: GooglePlaceDetailsResult): number | undefined {
    const numericCandidates = [
        result.typical_visit_duration_minutes,
        result.typical_time_spent_minutes,
        result.dwell_time_minutes,
        result.duration_minutes,
    ];

    for (const candidate of numericCandidates) {
        if (typeof candidate === "number" && Number.isFinite(candidate) && candidate > 0) {
            return Math.round(candidate);
        }
    }

    const textCandidates = [
        result.typical_visit_duration,
        result.typical_time_spent,
        result.duration,
    ];

    for (const candidate of textCandidates) {
        if (typeof candidate !== "string") continue;
        const parsed = parseDurationTextToMinutes(candidate);
        if (parsed && parsed > 0) return parsed;
    }

    const objectCandidates = [
        result.recommended_visit_duration,
        result.typical_visit_duration_range,
    ];

    for (const candidate of objectCandidates) {
        if (!candidate || typeof candidate !== "object") continue;
        const source = candidate as Record<string, unknown>;
        const min = source.min_minutes;
        const max = source.max_minutes;
        if (typeof min === "number" && Number.isFinite(min) && min > 0) return Math.round(min);
        if (typeof max === "number" && Number.isFinite(max) && max > 0) return Math.round(max);
    }

    return undefined;
}

export function PlaceAutocomplete({ onSelect, tripLocation, placeholder = "Search for places...", className }: PlaceAutocompleteProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Place[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Debounce search
    const fetchPredictions = useCallback(async () => {
        setIsLoading(true);
        try {
            let url = `/api/google/autocomplete?input=${encodeURIComponent(query)}`;
            if (tripLocation) {
                // Bias results to 50km radius of trip location
                url += `&location=${tripLocation.lat},${tripLocation.lng}&radius=50000`;
            }

            const res = await fetch(url);
            const data = await res.json() as GoogleAutocompleteResponse;

            if (data.predictions) {
                // Map predictions to a temporary Place structure (details will be fetched on select)
                const mapped: Place[] = data.predictions.map((prediction) => ({
                    id: crypto.randomUUID(),
                    googlePlaceId: prediction.place_id,
                    name: prediction.structured_formatting?.main_text ?? "Unknown place",
                    address: prediction.structured_formatting?.secondary_text,
                    type: mapGoogleType(prediction.types),
                    rating: 0, // Placeholder
                    image: "", // Placeholder
                }));
                setResults(mapped);
                setIsOpen(true);
            } else {
                setResults([]);
                setIsOpen(false);
            }
        } catch (error) {
            console.error("Failed to search", error);
        } finally {
            setIsLoading(false);
        }
    }, [query, tripLocation]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.length > 2) {
                fetchPredictions();
            } else {
                setResults([]);
                setIsOpen(false);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [query, fetchPredictions]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = async (prediction: Place) => {
        setIsLoading(true);
        try {
            // Fetch full details
            const res = await fetch(`/api/google/details?placeId=${prediction.googlePlaceId}`);
            const data = await res.json() as GooglePlaceDetailsResponse;
            const result = data.result;

            if (result) {
                const photoUrl = result.photos?.[0]?.photo_reference
                    ? `/api/google/photo?reference=${result.photos[0].photo_reference}&maxwidth=400`
                    : "";

                const fullPlace: Place = {
                    id: crypto.randomUUID(),
                    googlePlaceId: result.place_id,
                    name: result.name,
                    address: result.formatted_address,
                    type: mapGoogleType(result.types),
                    rating: result.rating || 0,
                    userRatingsTotal: result.user_ratings_total || 0,
                    image: photoUrl,
                    priceLevel: result.price_level,
                    website: result.website,
                    lat: result.geometry?.location?.lat,
                    lng: result.geometry?.location?.lng,
                    city: extractCity(result.address_components),
                    editorialSummary: result.editorial_summary?.overview,
                    openingHours: result.opening_hours?.weekday_text ?? result.current_opening_hours?.weekday_text,
                    formattedPhoneNumber: result.formatted_phone_number || result.international_phone_number,
                    typicalVisitDurationMinutes: extractTypicalVisitDurationMinutes(result),
                };

                onSelect(fullPlace);
                setQuery("");
                setIsOpen(false);
            }
        } catch (error) {
            console.error("Failed to fetch details", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div ref={wrapperRef} className={`relative w-full ${className}`}>
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" size={20} />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={placeholder}
                    className="w-full pl-12 pr-10 py-3 bg-transparent border-b-2 border-transparent text-xl font-display font-bold text-text placeholder:text-muted/50 focus:outline-none focus:border-primary transition-all rounded-t-lg hover:bg-surface/50 focus:bg-surface"
                    autoFocus
                />
                {query && (
                    <button
                        onClick={() => setQuery("")}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted hover:text-text p-1 rounded-full hover:bg-accent/20"
                    >
                        <X size={16} />
                    </button>
                )}
                {isLoading && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-surface/80 p-1">
                        <Loader2 className="animate-spin text-primary" size={18} />
                    </div>
                )}
            </div>

            {isOpen && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface/95 backdrop-blur-md border border-accent rounded-b-xl shadow-xl max-h-[400px] overflow-y-auto z-50 animate-in fade-in slide-in-from-top-2">
                    {results.map((place) => (
                        <button
                            key={place.id}
                            onClick={() => handleSelect(place)}
                            className="w-full text-left p-4 hover:bg-accent/30 transition-colors flex items-start gap-4 border-b border-accent/30 last:border-0 group"
                        >
                            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                <MapPin size={18} className="text-muted group-hover:text-primary" />
                            </div>
                            <div>
                                <h4 className="font-bold text-base text-text">{place.name}</h4>
                                <p className="text-sm text-muted line-clamp-1">{place.address}</p>
                            </div>
                        </button>
                    ))}
                    <div className="p-2 text-center border-t border-accent/20 bg-accent/5">
                        <span className="text-[11px] tracking-wide uppercase text-muted/80">Powered by Google</span>
                    </div>
                </div>
            )}
        </div>
    );
}
