import { NextResponse } from "next/server";
import { getTripClient } from "@/lib/auth";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { supabase } = await getTripClient(request);

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
