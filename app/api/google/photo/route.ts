import { NextResponse } from "next/server";

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const BASE_URL = "https://places.googleapis.com/v1";

export async function GET(request: Request) {
    if (!GOOGLE_API_KEY) {
        return NextResponse.json({ error: "Server API Key not configured" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const photoReference = searchParams.get("reference");
    const photoName = searchParams.get("name") || photoReference;
    const maxWidthRaw = searchParams.get("maxwidth") || "400";
    const parsedWidth = Number(maxWidthRaw);
    const maxWidth = Number.isFinite(parsedWidth) && parsedWidth > 0
        ? Math.min(Math.floor(parsedWidth), 1600)
        : 400;

    if (!photoName) {
        return NextResponse.json({ error: "Photo name is required" }, { status: 400 });
    }

    const normalizedPhotoName = photoName.startsWith("places/")
        ? photoName
        : `places/${photoName}`;
    const url = new URL(`${BASE_URL}/${normalizedPhotoName}/media`);
    url.searchParams.append("maxWidthPx", String(maxWidth));

    try {
        const response = await fetch(url.toString(), {
            headers: {
                "X-Goog-Api-Key": GOOGLE_API_KEY,
            },
        });

        if (!response.ok) {
            return NextResponse.json({ error: "Failed to fetch image" }, { status: response.status });
        }

        const headers = new Headers();
        headers.set("Content-Type", response.headers.get("Content-Type") || "image/jpeg");
        headers.set("Cache-Control", "public, max-age=86400");

        return new NextResponse(response.body, {
            status: 200,
            headers
        });

    } catch {
        return NextResponse.json({ error: "Failed to fetch photo" }, { status: 500 });
    }
}
