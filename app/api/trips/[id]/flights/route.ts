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

    const flight = await request.json();

    const { data, error } = await supabase
        .from('flights')
        .insert({
            trip_id: id,
            airline: flight.airline,
            flight_number: flight.flightNumber,
            departure_time: flight.departureTime,
            arrival_time: flight.arrivalTime,
            departure_airport: flight.departureAirport,
            arrival_airport: flight.arrivalAirport,
            price: flight.price,
            confirmation_code: flight.confirmationCode,
            notes: flight.notes
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, flight: data });
}
