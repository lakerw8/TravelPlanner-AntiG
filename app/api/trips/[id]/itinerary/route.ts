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

    const body = await request.json();

    // Expect body to contain { dayIndex: number, item: { placeId: string, ... } }
    if (body.dayIndex === undefined || !body.item?.placeId) {
        return NextResponse.json({ error: "Missing dayIndex or placeId" }, { status: 400 });
    }

    let nextOrderIndex = 0;
    const { data: orderRows, error: orderError } = await supabase
        .from("itinerary_items")
        .select("order_index")
        .eq("trip_id", id)
        .eq("day_index", body.dayIndex)
        .order("order_index", { ascending: false })
        .limit(1);

    if (!orderError) {
        nextOrderIndex = (orderRows?.[0]?.order_index ?? -1) + 1;
    }

    const insertPayload: {
        trip_id: string;
        place_id: string;
        day_index: number;
        start_time?: string;
        end_time?: string;
        notes?: string;
        order_index?: number;
    } = {
        trip_id: id,
        place_id: body.item.placeId, // Expects canonical place UUID.
        day_index: body.dayIndex,
        start_time: body.item.startTime,
        end_time: body.item.endTime,
        notes: body.item.notes,
    };

    if (!orderError) {
        insertPayload.order_index = nextOrderIndex;
    }

    const { data, error } = await supabase
        .from('itinerary_items')
        .insert(insertPayload)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, item: data });
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const authError = await ensureTripAccess(request, id);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");

    if (!itemId) {
        return NextResponse.json({ error: "Missing itemId" }, { status: 400 });
    }

    const { error } = await supabase
        .from('itinerary_items')
        .delete()
        .eq('id', itemId)
        .eq('trip_id', id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const authError = await ensureTripAccess(request, id);
    if (authError) return authError;

    const body = await request.json();

    if (body.dayIndex === undefined || !body.itemId || !body.updates) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { error } = await supabase
        .from('itinerary_items')
        .update({
            start_time: body.updates.startTime,
            end_time: body.updates.endTime,
            notes: body.updates.notes
        })
        .eq('id', body.itemId)
        .eq('trip_id', id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
