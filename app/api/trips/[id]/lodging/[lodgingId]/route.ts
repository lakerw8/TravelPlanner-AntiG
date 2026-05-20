import { NextResponse } from "next/server";
import { getTripClient } from "@/lib/auth";

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string; lodgingId: string }> },
) {
    const { id, lodgingId } = await params;
    const { supabase } = await getTripClient(request);

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
