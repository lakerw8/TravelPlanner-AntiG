import { NextResponse } from "next/server";
import { requireAuthenticatedUser, userOwnsTrip } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { ItineraryItem, Place, PlaceList, Trip } from "@/lib/types";
import { addDaysToDateOnly, diffDaysBetweenDateOnly } from "@/lib/date";
import {
    DbFlightRow,
    DbItineraryItemRow,
    DbListItemRow,
    DbListRow,
    DbLodgingRow,
    DbPlaceRow,
    DbTripRow,
    dateDiffInclusive,
    formatTimeFromIso,
    mapItineraryRowToItem,
    mapPlaceRowToPlace,
} from "@/lib/trip-mappers";

export const dynamic = "force-dynamic";

function dayIndexFromIsoDate(isoDate: string | null, tripStartDate: string, totalDays: number): number | null {
    const index = diffDaysBetweenDateOnly(tripStartDate, isoDate);
    if (index === null) return null;
    return index >= 0 && index < totalDays ? index : null;
}

function buildFlightPlace(row: DbFlightRow): Place {
    const airline = row.airline ?? "Flight";
    const flightNumber = row.flight_number ? ` ${row.flight_number}` : "";
    const departure = row.departure_airport ?? "";
    const arrival = row.arrival_airport ?? "";

    return {
        id: `flight-place-${row.id}`,
        googlePlaceId: `flight-${row.id}`,
        name: `${airline}${flightNumber}`.trim(),
        address: `${departure} -> ${arrival}`.trim(),
        type: "flight",
        notes: row.notes ?? undefined,
    };
}

function buildFlightItem(row: DbFlightRow): ItineraryItem {
    return {
        id: `flight-item-${row.id}`,
        placeId: `flight-place-${row.id}`,
        startTime: formatTimeFromIso(row.departure_time),
        endTime: formatTimeFromIso(row.arrival_time),
        notes: row.notes ?? undefined,
        itemType: "flight",
        sourceId: row.id,
    };
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    const auth = await requireAuthenticatedUser(request);
    if (auth.error || !auth.user) {
        return auth.error!;
    }

    const ownsTrip = await userOwnsTrip(id, auth.user.id);
    if (!ownsTrip) {
        return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const { data: tripRow, error: tripError } = await supabase
        .from("trips")
        .select("id,user_id,title,start_date,end_date,cover_image,lat,lng")
        .eq("id", id)
        .single();

    if (tripError || !tripRow) {
        return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const [
        { data: listRows, error: listError },
        { data: lodgingRows, error: lodgingError },
        { data: flightRows, error: flightError },
    ] = await Promise.all([
        supabase.from("lists").select("id,trip_id,title").eq("trip_id", id),
        supabase.from("lodgings").select("id,trip_id,place_id,check_in,check_out,notes").eq("trip_id", id),
        supabase
            .from("flights")
            .select("id,trip_id,airline,flight_number,departure_time,arrival_time,departure_airport,arrival_airport,notes")
            .eq("trip_id", id),
    ]);

    if (listError || lodgingError || flightError) {
        return NextResponse.json(
            { error: listError?.message ?? lodgingError?.message ?? flightError?.message ?? "Failed to load trip details" },
            { status: 500 },
        );
    }

    const itineraryWithOrder = await supabase
        .from("itinerary_items")
        .select("id,trip_id,place_id,day_index,start_time,end_time,notes,order_index,created_at")
        .eq("trip_id", id);

    let itineraryRows = itineraryWithOrder.data;
    let itineraryError = itineraryWithOrder.error;

    if (itineraryError?.message?.includes("order_index")) {
        const fallbackItinerary = await supabase
            .from("itinerary_items")
            .select("id,trip_id,place_id,day_index,start_time,end_time,notes,created_at")
            .eq("trip_id", id);

        const fallbackRows = (fallbackItinerary.data ?? []) as Array<{
            id: string;
            trip_id: string;
            place_id: string;
            day_index: number;
            start_time: string | null;
            end_time: string | null;
            notes: string | null;
            created_at: string | null;
        }>;

        itineraryRows = fallbackRows.map((row) => ({
            ...row,
            order_index: null,
        }));
        itineraryError = fallbackItinerary.error;
    }

    if (itineraryError) {
        return NextResponse.json({ error: itineraryError.message }, { status: 500 });
    }

    const typedLists = (listRows ?? []) as DbListRow[];
    const typedItineraryRows = (itineraryRows ?? []) as DbItineraryItemRow[];
    const typedLodgingRows = (lodgingRows ?? []) as DbLodgingRow[];
    const typedFlightRows = (flightRows ?? []) as DbFlightRow[];

    const listIds = typedLists.map((row) => row.id);
    const { data: listItemRows, error: listItemsError } = listIds.length === 0
        ? { data: [] as DbListItemRow[], error: null }
        : await supabase
            .from("list_items")
            .select("list_id,place_id")
            .in("list_id", listIds);

    if (listItemsError) {
        return NextResponse.json({ error: listItemsError.message }, { status: 500 });
    }

    const typedListItems = (listItemRows ?? []) as DbListItemRow[];

    const placeIdSet = new Set<string>();
    for (const listItem of typedListItems) {
        placeIdSet.add(listItem.place_id);
    }
    for (const itineraryItem of typedItineraryRows) {
        placeIdSet.add(itineraryItem.place_id);
    }
    for (const lodging of typedLodgingRows) {
        placeIdSet.add(lodging.place_id);
    }

    const placeIds = Array.from(placeIdSet);
    const { data: placeRows, error: placeError } = placeIds.length === 0
        ? { data: [] as DbPlaceRow[], error: null }
        : await supabase
            .from("places")
            .select("id,google_place_id,name,address,rating,user_ratings_total,type,image,price_level,website,lat,lng,city,opening_hours,details")
            .in("id", placeIds);

    if (placeError) {
        return NextResponse.json({ error: placeError.message }, { status: 500 });
    }

    const placesMap: Record<string, Place> = {};
    for (const row of (placeRows ?? []) as DbPlaceRow[]) {
        placesMap[row.id] = mapPlaceRowToPlace(row);
    }

    for (const lodgingRow of typedLodgingRows) {
        const place = placesMap[lodgingRow.place_id];
        if (!place) continue;
        placesMap[lodgingRow.place_id] = {
            ...place,
            type: "lodging",
            notes: lodgingRow.notes ?? place.notes,
            checkIn: lodgingRow.check_in ?? undefined,
            checkOut: lodgingRow.check_out ?? undefined,
        } as Place;
    }

    for (const flightRow of typedFlightRows) {
        const virtualPlace = buildFlightPlace(flightRow);
        placesMap[virtualPlace.id] = virtualPlace;
    }

    const totalDays = dateDiffInclusive(tripRow.start_date, tripRow.end_date);

    const itineraryByDay: Record<number, ItineraryItem[]> = {};
    for (const row of typedItineraryRows) {
        const mapped = mapItineraryRowToItem(row);
        if (!itineraryByDay[row.day_index]) {
            itineraryByDay[row.day_index] = [];
        }
        itineraryByDay[row.day_index].push(mapped);
    }

    for (const dayIndex of Object.keys(itineraryByDay).map((key) => Number(key))) {
        itineraryByDay[dayIndex].sort((a, b) => (a.orderIndex ?? Number.MAX_SAFE_INTEGER) - (b.orderIndex ?? Number.MAX_SAFE_INTEGER));
    }

    const virtualByDay: Record<number, ItineraryItem[]> = {};
    for (const flightRow of typedFlightRows) {
        const dayIndex = dayIndexFromIsoDate(flightRow.departure_time, tripRow.start_date, totalDays);
        if (dayIndex === null) continue;
        if (!virtualByDay[dayIndex]) {
            virtualByDay[dayIndex] = [];
        }
        virtualByDay[dayIndex].push(buildFlightItem(flightRow));
    }

    for (const lodgingRow of typedLodgingRows) {
        const checkInDay = dayIndexFromIsoDate(lodgingRow.check_in, tripRow.start_date, totalDays);
        const checkOutDay = dayIndexFromIsoDate(lodgingRow.check_out, tripRow.start_date, totalDays);

        if (checkInDay !== null) {
            if (!virtualByDay[checkInDay]) {
                virtualByDay[checkInDay] = [];
            }
            virtualByDay[checkInDay].push({
                id: `lodging-checkin-${lodgingRow.id}`,
                placeId: lodgingRow.place_id,
                startTime: formatTimeFromIso(lodgingRow.check_in) ?? "15:00",
                notes: lodgingRow.notes ?? "Check-in",
                subtype: "checkin",
                itemType: "lodging",
                sourceId: lodgingRow.id,
                lodgingId: lodgingRow.id,
            });
        }

        if (checkOutDay !== null && checkOutDay !== checkInDay) {
            if (!virtualByDay[checkOutDay]) {
                virtualByDay[checkOutDay] = [];
            }
            virtualByDay[checkOutDay].push({
                id: `lodging-checkout-${lodgingRow.id}`,
                placeId: lodgingRow.place_id,
                startTime: formatTimeFromIso(lodgingRow.check_out) ?? "11:00",
                notes: lodgingRow.notes ?? "Check-out",
                subtype: "checkout",
                itemType: "lodging",
                sourceId: lodgingRow.id,
                lodgingId: lodgingRow.id,
            });
        }
    }

    for (const dayIndex of Object.keys(virtualByDay).map((key) => Number(key))) {
        virtualByDay[dayIndex].sort((a, b) => (a.startTime ?? "23:59").localeCompare(b.startTime ?? "23:59"));
    }

    const tripDays = Array.from({ length: totalDays }, (_, dayIndex) => {
        const virtualItems = virtualByDay[dayIndex] ?? [];
        const itineraryItemsForDay = itineraryByDay[dayIndex] ?? [];

        return {
            date: addDaysToDateOnly(tripRow.start_date, dayIndex) ?? tripRow.start_date,
            items: [...virtualItems, ...itineraryItemsForDay],
        };
    });

    const placeIdsByList = typedListItems.reduce<Record<string, string[]>>((acc, item) => {
        if (!acc[item.list_id]) acc[item.list_id] = [];
        acc[item.list_id].push(item.place_id);
        return acc;
    }, {});

    const formattedLists: PlaceList[] = typedLists.map((listRow) => ({
        id: listRow.id,
        title: listRow.title,
        placeIds: placeIdsByList[listRow.id] ?? [],
    }));

    const typedTrip = tripRow as DbTripRow;
    const trip: Trip = {
        id: typedTrip.id,
        userId: typedTrip.user_id ?? "",
        title: typedTrip.title,
        startDate: typedTrip.start_date,
        endDate: typedTrip.end_date,
        coverImage: typedTrip.cover_image ?? undefined,
        lat: typedTrip.lat ?? undefined,
        lng: typedTrip.lng ?? undefined,
        places: placesMap,
        itinerary: tripDays,
        lists: formattedLists,
        flights: [],
        lodging: [],
    };

    return NextResponse.json(trip);
}
