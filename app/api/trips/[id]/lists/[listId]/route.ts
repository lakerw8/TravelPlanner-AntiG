import { NextResponse } from "next/server";
import { requireAuthenticatedUser, userOwnsTrip } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

async function ensureListAccess(request: Request, tripId: string, listId: string): Promise<NextResponse | null> {
    const auth = await requireAuthenticatedUser(request);
    if (auth.error || !auth.user) {
        return auth.error!;
    }

    const ownsTrip = await userOwnsTrip(tripId, auth.user.id);
    if (!ownsTrip) {
        return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const { data: listRow, error } = await supabase
        .from("lists")
        .select("id")
        .eq("id", listId)
        .eq("trip_id", tripId)
        .maybeSingle();

    if (error || !listRow) {
        return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    return null;
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string; listId: string }> }
) {
    const { id, listId } = await params;
    const authError = await ensureListAccess(request, id, listId);
    if (authError) return authError;

    const { placeId } = await request.json();

    if (!placeId) {
        return NextResponse.json({ error: "Missing placeId" }, { status: 400 });
    }

    const { error } = await supabase
        .from('list_items')
        .upsert({
            list_id: listId,
            place_id: placeId
        }, { onConflict: 'list_id, place_id' });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string; listId: string }> }
) {
    const { id, listId } = await params;
    const authError = await ensureListAccess(request, id, listId);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const placeId = searchParams.get("placeId");

    if (!placeId) {
        const { error } = await supabase
            .from('lists')
            .delete()
            .eq('id', listId)
            .eq('trip_id', id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    }

    const { error } = await supabase
        .from('list_items')
        .delete()
        .eq('list_id', listId)
        .eq('place_id', placeId);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
