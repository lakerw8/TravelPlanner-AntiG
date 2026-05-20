import { NextResponse } from "next/server";
import { getTripClient } from "@/lib/auth";

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string; flightId: string }> },
) {
    const { id, flightId } = await params;
    const { supabase } = await getTripClient(request);

    const { error } = await supabase
        .from("flights")
        .delete()
        .eq("trip_id", id)
        .eq("id", flightId);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
