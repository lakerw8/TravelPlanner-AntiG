export type PlaceType = "lodging" | "restaurant" | "activity" | "flight";

export interface Place {
  id: string;
  googlePlaceId: string;
  name: string;
  address?: string;
  rating?: number;
  userRatingsTotal?: number;
  type: PlaceType;
  image?: string;
  priceLevel?: number;
  website?: string;
  notes?: string;
  checkIn?: string;
  checkOut?: string;
  lat?: number;
  lng?: number;
  city?: string;
  editorialSummary?: string;
  openingHours?: string[];
  formattedPhoneNumber?: string;
  typicalVisitDurationMinutes?: number;
}

export interface Flight {
  id: string;
  tripId: string;
  airline: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  departureAirport: string;
  arrivalAirport: string;
  price?: number;
  confirmationCode?: string;
  notes?: string;
}

export interface ItineraryItem {
  id: string;
  placeId: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
  orderIndex?: number;
  itemType?: "itinerary" | "flight" | "lodging";
  sourceId?: string;
  subtype?: "checkin" | "checkout";
  lodgingId?: string;
}

export interface TripDay {
  date: string;
  items: ItineraryItem[];
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
  startDate: string;
  endDate: string;
  coverImage?: string;
  places: Record<string, Place>;
  flights?: Flight[];
  lodging?: Place[];
  itinerary: TripDay[];
  lists?: PlaceList[];
  lat?: number;
  lng?: number;
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

export interface GooglePrediction {
  place_id: string;
  types?: string[];
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
}

export interface GoogleAutocompleteResponse {
  predictions?: GooglePrediction[];
}

export interface GoogleDetailsResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  types?: string[];
  rating?: number;
  user_ratings_total?: number;
  photos?: Array<{ photo_reference: string }>;
  price_level?: number;
  website?: string;
  geometry?: { location?: { lat?: number; lng?: number } };
  address_components?: Array<{ long_name: string; types: string[] }>;
  editorial_summary?: { overview?: string };
  opening_hours?: { weekday_text?: string[] };
  current_opening_hours?: { weekday_text?: string[] };
  formatted_phone_number?: string;
  international_phone_number?: string;
}

export interface GoogleDetailsResponse {
  result?: GoogleDetailsResult;
}
