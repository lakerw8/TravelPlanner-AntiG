import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import { DbTripRow, mapTripRowToSummary } from "@/lib/trip-mappers";

export async function GET(request: Request) {
    const auth = await requireAuthenticatedUser(request);
    if (auth.error) return auth.error;
    const { user, supabase } = auth;

    const { data: trips, error } = await supabase
        .from('trips')
        .select('id,user_id,title,destination,start_date,end_date,cover_image,lat,lng')
        .eq("user_id", user.id)
        .order('start_date', { ascending: true });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const mappedTrips = (trips as DbTripRow[] | null)?.map(mapTripRowToSummary) ?? [];
    return NextResponse.json(mappedTrips);
}

export async function POST(request: Request) {
    const auth = await requireAuthenticatedUser(request);
    if (auth.error) return auth.error;
    const { user, supabase } = auth;

    const body = await request.json();

    if (!body.title || !body.startDate || !body.endDate) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const destinationQuery = body.destination || body.title;
    let lat = null;
    let lng = null;
    let destination = destinationQuery;
    const coverImage = "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop";

    // 1. Geocode the destination (with 5s timeout to avoid hanging)
    if (process.env.GOOGLE_MAPS_API_KEY) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        try {
            const geoRes = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(destinationQuery)}&key=${process.env.GOOGLE_MAPS_API_KEY}`,
                { signal: controller.signal }
            );
            const geoData = await geoRes.json();

            if (geoData.status === 'OK' && geoData.results?.[0]) {
                const location = geoData.results[0].geometry.location;
                lat = location.lat;
                lng = location.lng;
                destination = geoData.results[0].formatted_address;
            }
        } catch (e) {
            console.error("Geocoding failed (may have timed out):", e);
        } finally {
            clearTimeout(timeout);
        }
    }

    const { data, error } = await supabase
        .from('trips')
        .insert({
            title: body.title,
            user_id: user.id,
            destination: destination,
            start_date: body.startDate,
            end_date: body.endDate,
            cover_image: coverImage,
            lat: lat,
            lng: lng
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return the new trip (adjusting keys to match frontend expectation if needed, 
    // but frontend uses camelCase. DB is snake_case. 
    // We might need a transformer or update frontend types.
    // For now, let's map it back to camelCase to stay compatible with existing types)

    const mappedTrip = mapTripRowToSummary(data as DbTripRow);
    const newTrip = { ...mappedTrip, places: {}, itinerary: [], lists: [] };

    return NextResponse.json(newTrip);
}
