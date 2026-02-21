import { NextResponse } from "next/server";
import { requireAuthenticatedUser, userOwnsTrip } from "@/lib/auth";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const auth = await requireAuthenticatedUser(request);
    if (auth.error) return auth.error;
    const { user, supabase } = auth;

    const ownsTrip = await userOwnsTrip(supabase, id, user.id);
    if (!ownsTrip) {
        return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const { title } = await request.json();

    if (!title) {
        return NextResponse.json({ error: "Missing title" }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('lists')
        .insert({
            trip_id: id,
            title
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}
