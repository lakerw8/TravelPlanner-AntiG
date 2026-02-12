export type PlaceType = 'lodging' | 'restaurant' | 'activity' | 'flight';

export interface Place {
    id: string;
    googlePlaceId: string;
    name: string;
    address?: string;
    rating?: number;
    userRatingsTotal?: number;
    type: PlaceType;
    image?: string;
    priceLevel?: number; // 0-4
    website?: string;
    notes?: string;
    checkIn?: string;
    checkOut?: string;
    lat?: number;
    lng?: number;
    city?: string; // Added for context-aware search
    editorialSummary?: string;
    openingHours?: string[]; // Array of strings (e.g., "Monday: 9:00 AM – 5:00 PM")
    formattedPhoneNumber?: string;
    typicalVisitDurationMinutes?: number;
}

export interface Flight {
    id: string;
    tripId: string;
    airline: string;
    flightNumber: string;
    departureTime: string; // ISO string
    arrivalTime: string; // ISO string
    departureAirport: string;
    arrivalAirport: string;
    price?: number;
    confirmationCode?: string;
    notes?: string;
}

export interface Lodging extends Place {
    checkIn?: string; // ISO Date string
    checkOut?: string; // ISO Date string
}

export interface TripDay {
    date: string; // ISO date string YYYY-MM-DD
    items: ItineraryItem[];
}

export interface ItineraryItem {
    id: string;
    placeId: string;
    startTime?: string; // HH:mm
    endTime?: string; // HH:mm
    notes?: string;
    orderIndex?: number;
    itemType?: "itinerary" | "flight" | "lodging";
    sourceId?: string;
    subtype?: 'checkin' | 'checkout';
    lodgingId?: string;
}

export interface PlaceList {
    id: string;
    title: string;
    placeIds: string[];
}

export interface Trip {
    id: string;
    userId: string;
    title: string;
    startDate: string; // ISO date string
    endDate: string; // ISO date string
    coverImage?: string;
    places: Record<string, Place>; // Normalized places
    flights?: Flight[];
    lodging?: Lodging[];
    itinerary: TripDay[];
    lists?: PlaceList[];
    lat?: number; // Central location latitude for search biasing
    lng?: number; // Central location longitude for search biasing
}

export interface TripSummary {
    id: string;
    userId: string;
    title: string;
    destination?: string;
    startDate: string;
    endDate: string;
    coverImage?: string;
    lat?: number;
    lng?: number;
}
