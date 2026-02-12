import { NextResponse } from "next/server";
import { requireAuthenticatedUser, userOwnsTrip } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
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

    const body = await request.json();
    const detailsPayload: Record<string, unknown> = {
        editorial_summary: body.editorialSummary ?? null,
        formatted_phone_number: body.formattedPhoneNumber ?? null,
        typical_visit_duration_minutes: body.typicalVisitDurationMinutes ?? null,
    };
    const hasDetails = Object.values(detailsPayload).some((value) => value !== null && value !== undefined);

    // 1. Upsert Place
    const { data: place, error: placeError } = await supabase
        .from('places')
        .upsert({
            google_place_id: body.googlePlaceId,
            name: body.name,
            address: body.address,
            rating: body.rating,
            user_ratings_total: body.userRatingsTotal,
            type: body.type,
            image: body.image,
            price_level: body.priceLevel,
            website: body.website,
            lat: body.lat,
            lng: body.lng,
            city: body.city,
            opening_hours: body.openingHours ?? null,
            details: hasDetails ? detailsPayload : null,
        }, { onConflict: 'google_place_id' })
        .select()
        .single();

    if (placeError) {
        return NextResponse.json({ error: placeError.message }, { status: 500 });
    }

    // 2. Ensure it's linked to the trip via a "Saved Places" list (if not already linked)
    // Find a list named "Saved Places" for this trip
    const { data: existingLists } = await supabase
        .from('lists')
        .select('id')
        .eq('trip_id', id)
        .eq('title', 'Saved Places')
        .single();

    let listId = existingLists?.id;

    if (!listId) {
        // Create "Saved Places" list
        const { data: newList, error: listError } = await supabase
            .from('lists')
            .insert({ trip_id: id, title: 'Saved Places' })
            .select()
            .single();

        if (listError) console.error("Error creating default list", listError);
        listId = newList?.id;
    }

    if (listId) {
        await supabase
            .from('list_items')
            .upsert({ list_id: listId, place_id: place.id }, { onConflict: 'list_id, place_id' });
    }

    // Return the Place object as expected by frontend
    return NextResponse.json({
        id: place.id,
        googlePlaceId: place.google_place_id,
        name: place.name,
        address: place.address,
        rating: place.rating,
        userRatingsTotal: place.user_ratings_total,
        type: place.type,
        image: place.image,
        priceLevel: place.price_level,
        website: place.website,
        lat: place.lat,
        lng: place.lng,
        city: place.city,
        openingHours: place.opening_hours ?? body.openingHours,
        editorialSummary: (place.details && typeof place.details === "object" && typeof (place.details as Record<string, unknown>).editorial_summary === "string")
            ? ((place.details as Record<string, unknown>).editorial_summary as string)
            : body.editorialSummary,
        formattedPhoneNumber: (place.details && typeof place.details === "object" && typeof (place.details as Record<string, unknown>).formatted_phone_number === "string")
            ? ((place.details as Record<string, unknown>).formatted_phone_number as string)
            : body.formattedPhoneNumber,
        typicalVisitDurationMinutes: (place.details && typeof place.details === "object" && typeof (place.details as Record<string, unknown>).typical_visit_duration_minutes === "number")
            ? Math.round((place.details as Record<string, unknown>).typical_visit_duration_minutes as number)
            : body.typicalVisitDurationMinutes,
    });
}
