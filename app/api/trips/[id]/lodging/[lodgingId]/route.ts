import { NextResponse } from "next/server";
import { requireAuthenticatedUser, userOwnsTrip } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string; lodgingId: string }> },
) {
    const { id, lodgingId } = await params;
    const auth = await requireAuthenticatedUser(request);
    if (auth.error || !auth.user) {
        return auth.error!;
    }

    const ownsTrip = await userOwnsTrip(id, auth.user.id);
    if (!ownsTrip) {
        return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const { error } = await supabase
        .from("lodgings")
        .delete()
        .eq("trip_id", id)
        .eq("id", lodgingId);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
