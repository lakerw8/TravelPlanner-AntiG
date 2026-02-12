import { NextResponse } from "next/server";
import { requireAuthenticatedUser, userOwnsTrip } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function PUT(
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
    const { itemIds, targetDayIndex } = body;

    if (
        !itemIds || !Array.isArray(itemIds) ||
        targetDayIndex === undefined
    ) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data: existingItems, error: existingItemsError } = await supabase
        .from("itinerary_items")
        .select("id")
        .eq("trip_id", id)
        .in("id", itemIds);

    if (existingItemsError) {
        return NextResponse.json({ error: existingItemsError.message }, { status: 500 });
    }

    if (!existingItems || existingItems.length !== itemIds.length) {
        return NextResponse.json({ error: "One or more itinerary items were not found" }, { status: 404 });
    }

    const { data: maxOrderRows, error: maxOrderError } = await supabase
        .from("itinerary_items")
        .select("order_index")
        .eq("trip_id", id)
        .eq("day_index", targetDayIndex)
        .order("order_index", { ascending: false })
        .limit(1);

    const supportsOrderIndex = !maxOrderError;
    if (maxOrderError && !maxOrderError.message.includes("order_index")) {
        return NextResponse.json({ error: maxOrderError.message }, { status: 500 });
    }

    const currentMaxOrder = maxOrderRows?.[0]?.order_index ?? -1;

    const updates = itemIds.map((itemId, index) => {
        const payload = supportsOrderIndex
            ? { day_index: targetDayIndex, order_index: currentMaxOrder + index + 1 }
            : { day_index: targetDayIndex };

        return supabase
            .from("itinerary_items")
            .update(payload)
            .eq("trip_id", id)
            .eq("id", itemId);
    });

    const updateResults = await Promise.all(updates);
    const failedUpdate = updateResults.find((result) => result.error);
    if (failedUpdate?.error) {
        return NextResponse.json({ error: failedUpdate.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
