import { NextResponse } from "next/server";
import { requireAuthenticatedUser, userOwnsTrip } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

async function ensureTripAccess(request: Request, tripId: string): Promise<NextResponse | null> {
    const auth = await requireAuthenticatedUser(request);
    if (auth.error || !auth.user) {
        return auth.error!;
    }

    const ownsTrip = await userOwnsTrip(tripId, auth.user.id);
    if (!ownsTrip) {
        return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    return null;
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const authError = await ensureTripAccess(request, id);
    if (authError) return authError;

    const lodging = await request.json();
    const detailsPayload: Record<string, unknown> = {
        editorial_summary: lodging.editorialSummary ?? null,
        formatted_phone_number: lodging.formattedPhoneNumber ?? null,
        typical_visit_duration_minutes: lodging.typicalVisitDurationMinutes ?? null,
    };
    const hasDetails = Object.values(detailsPayload).some((value) => value !== null && value !== undefined);

    // 1. Upsert Place first (Lodging extends Place)
    const { data: place, error: placeError } = await supabase
        .from('places')
        .upsert({
            google_place_id: lodging.googlePlaceId,
            name: lodging.name,
            address: lodging.address,
            rating: lodging.rating,
            user_ratings_total: lodging.userRatingsTotal,
            type: lodging.type,
            image: lodging.image,
            price_level: lodging.priceLevel,
            website: lodging.website,
            lat: lodging.lat,
            lng: lodging.lng,
            city: lodging.city,
            opening_hours: lodging.openingHours ?? null,
            details: hasDetails ? detailsPayload : null,
        }, { onConflict: 'google_place_id' })
        .select()
        .single();

    if (placeError) {
        return NextResponse.json({ error: placeError.message }, { status: 500 });
    }

    // 2. Insert Lodging Record
    const { data: lodgingData, error: lodgingError } = await supabase
        .from('lodgings')
        .insert({
            trip_id: id,
            place_id: place.id,
            check_in: lodging.checkIn,
            check_out: lodging.checkOut,
            notes: lodging.notes
        })
        .select()
        .single();

    if (lodgingError) {
        return NextResponse.json({ error: lodgingError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, lodging: lodgingData });
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const authError = await ensureTripAccess(request, id);
    if (authError) return authError;

    const { placeId, checkIn, checkOut, notes } = await request.json();

    if (!placeId) {
        return NextResponse.json({ error: "Missing placeId" }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('lodgings')
        .update({
            check_in: checkIn,
            check_out: checkOut,
            notes: notes
        })
        .eq('trip_id', id)
        .eq('place_id', placeId)
        .select();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, lodging: data });
}
