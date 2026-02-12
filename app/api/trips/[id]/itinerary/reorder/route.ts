import { NextResponse } from "next/server";
import { requireAuthenticatedUser, userOwnsTrip } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

interface ReorderRequestBody {
    itemId?: string;
    sourceDayIndex?: number;
    sourceIndex?: number;
    destDayIndex?: number;
    destIndex?: number;
}

interface ItineraryOrderRow {
    id: string;
    day_index: number;
    order_index: number | null;
}

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

    const body = await request.json() as ReorderRequestBody;
    const { itemId, sourceDayIndex, sourceIndex, destDayIndex, destIndex } = body;

    if (
        destDayIndex === undefined ||
        destIndex === undefined
    ) {
        return NextResponse.json({ error: "Missing destination indices" }, { status: 400 });
    }

    const withOrder = await supabase
        .from("itinerary_items")
        .select("id,day_index,order_index")
        .eq("trip_id", id);

    let allItems = withOrder.data;
    let error = withOrder.error;
    let supportsOrderIndex = true;

    if (error?.message?.includes("order_index")) {
        const fallback = await supabase
            .from("itinerary_items")
            .select("id,day_index")
            .eq("trip_id", id);

        const fallbackRows = (fallback.data ?? []) as Array<{ id: string; day_index: number }>;
        allItems = fallbackRows.map((row) => ({
            ...row,
            order_index: null,
        }));
        error = fallback.error;
        supportsOrderIndex = false;
    }

    if (error || !allItems) {
        return NextResponse.json({ error: error?.message || "Failed to fetch items" }, { status: 500 });
    }

    const typedItems = allItems as ItineraryOrderRow[];
    const rowsForDay = (day: number) =>
        typedItems
            .filter((row) => row.day_index === day)
            .sort((a, b) => (a.order_index ?? Number.MAX_SAFE_INTEGER) - (b.order_index ?? Number.MAX_SAFE_INTEGER));

    let resolvedSourceDay = sourceDayIndex;
    let movingItemId = itemId;

    if (!movingItemId) {
        if (sourceDayIndex === undefined || sourceIndex === undefined) {
            return NextResponse.json({ error: "Missing itemId or source indices" }, { status: 400 });
        }

        const sourceRows = rowsForDay(sourceDayIndex);
        movingItemId = sourceRows[sourceIndex]?.id;
        if (!movingItemId) {
            return NextResponse.json({ error: "Item not found at source index" }, { status: 404 });
        }
    }

    const movingItem = typedItems.find((row) => row.id === movingItemId);
    if (!movingItem) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (resolvedSourceDay === undefined) {
        resolvedSourceDay = movingItem.day_index;
    }

    const sourceRowsWithoutMoving = rowsForDay(resolvedSourceDay).filter((row) => row.id !== movingItem.id);
    const destinationRowsBase = resolvedSourceDay === destDayIndex
        ? sourceRowsWithoutMoving
        : rowsForDay(destDayIndex).filter((row) => row.id !== movingItem.id);

    const insertionIndex = Math.max(0, Math.min(destIndex, destinationRowsBase.length));
    const destinationRows = [...destinationRowsBase];
    destinationRows.splice(insertionIndex, 0, { ...movingItem, day_index: destDayIndex });

    const updatePayloads: Array<{ id: string; day_index: number; order_index: number }> = [];
    sourceRowsWithoutMoving.forEach((row, index) => {
        if (resolvedSourceDay !== destDayIndex) {
            updatePayloads.push({ id: row.id, day_index: resolvedSourceDay!, order_index: index });
        }
    });
    destinationRows.forEach((row, index) => {
        updatePayloads.push({ id: row.id, day_index: destDayIndex, order_index: index });
    });

    const seen = new Set<string>();
    const dedupedPayloads = updatePayloads.filter((payload) => {
        if (seen.has(payload.id)) return false;
        seen.add(payload.id);
        return true;
    });

    const updates = dedupedPayloads.map((payload) =>
        supabase
            .from("itinerary_items")
            .update(
                supportsOrderIndex
                    ? { day_index: payload.day_index, order_index: payload.order_index }
                    : { day_index: payload.day_index },
            )
            .eq("trip_id", id)
            .eq("id", payload.id)
    );

    const updateResults = await Promise.all(updates);
    const failedUpdate = updateResults.find((result) => result.error);
    if (failedUpdate?.error) {
        return NextResponse.json({ error: failedUpdate.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
