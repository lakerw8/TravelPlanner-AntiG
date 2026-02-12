import { ItineraryItem, Place, TripSummary } from "@/lib/types";
import { diffDaysBetweenDateOnly } from "@/lib/date";

export interface DbTripRow {
    id: string;
    user_id: string | null;
    title: string;
    destination: string | null;
    start_date: string;
    end_date: string;
    cover_image: string | null;
    lat: number | null;
    lng: number | null;
}

export interface DbPlaceRow {
    id: string;
    google_place_id: string;
    name: string;
    address: string | null;
    rating: number | null;
    user_ratings_total: number | null;
    type: string | null;
    image: string | null;
    price_level: number | null;
    website: string | null;
    lat: number | null;
    lng: number | null;
    city: string | null;
    opening_hours: string[] | null;
    details: Record<string, unknown> | null;
}

export interface DbListRow {
    id: string;
    trip_id: string;
    title: string;
}

export interface DbListItemRow {
    list_id: string;
    place_id: string;
}

export interface DbItineraryItemRow {
    id: string;
    trip_id: string;
    place_id: string;
    day_index: number;
    start_time: string | null;
    end_time: string | null;
    notes: string | null;
    order_index: number | null;
    created_at: string | null;
}

export interface DbFlightRow {
    id: string;
    trip_id: string;
    airline: string | null;
    flight_number: string | null;
    departure_time: string | null;
    arrival_time: string | null;
    departure_airport: string | null;
    arrival_airport: string | null;
    notes: string | null;
}

export interface DbLodgingRow {
    id: string;
    trip_id: string;
    place_id: string;
    check_in: string | null;
    check_out: string | null;
    notes: string | null;
}

export function mapTripRowToSummary(row: DbTripRow): TripSummary {
    return {
        id: row.id,
        userId: row.user_id ?? "",
        title: row.title,
        destination: row.destination ?? undefined,
        startDate: row.start_date,
        endDate: row.end_date,
        coverImage: row.cover_image ?? undefined,
        lat: row.lat ?? undefined,
        lng: row.lng ?? undefined,
    };
}

export function mapPlaceRowToPlace(row: DbPlaceRow): Place {
    const rawType = row.type ?? "activity";
    const placeType = rawType === "lodging" || rawType === "restaurant" || rawType === "flight"
        ? rawType
        : "activity";
    const details = row.details && typeof row.details === "object"
        ? row.details
        : {};
    const editorialSummary = typeof details.editorial_summary === "string"
        ? details.editorial_summary
        : undefined;
    const formattedPhoneNumber = typeof details.formatted_phone_number === "string"
        ? details.formatted_phone_number
        : undefined;
    const typicalVisitDurationMinutes = typeof details.typical_visit_duration_minutes === "number"
        ? Math.round(details.typical_visit_duration_minutes)
        : undefined;

    return {
        id: row.id,
        googlePlaceId: row.google_place_id,
        name: row.name,
        address: row.address ?? undefined,
        rating: row.rating ?? undefined,
        userRatingsTotal: row.user_ratings_total ?? undefined,
        type: placeType,
        image: row.image ?? undefined,
        priceLevel: row.price_level ?? undefined,
        website: row.website ?? undefined,
        lat: row.lat ?? undefined,
        lng: row.lng ?? undefined,
        city: row.city ?? undefined,
        openingHours: row.opening_hours ?? undefined,
        editorialSummary,
        formattedPhoneNumber,
        typicalVisitDurationMinutes,
    };
}

export function mapItineraryRowToItem(row: DbItineraryItemRow): ItineraryItem {
    return {
        id: row.id,
        placeId: row.place_id,
        startTime: row.start_time ?? undefined,
        endTime: row.end_time ?? undefined,
        notes: row.notes ?? undefined,
        orderIndex: row.order_index ?? undefined,
        itemType: "itinerary",
        sourceId: row.id,
    };
}

export function formatTimeFromIso(value?: string | null): string | undefined {
    if (!value) return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    return date.toISOString().slice(11, 16);
}

export function dateDiffInclusive(startDate: string, endDate: string): number {
    const diffDays = diffDaysBetweenDateOnly(startDate, endDate);
    if (diffDays === null) return 1;
    return Math.max(0, diffDays) + 1;
}
