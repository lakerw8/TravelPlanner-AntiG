import {
  GoogleAutocompleteResponse,
  GoogleDetailsResponse,
  Place,
  Trip,
  TripSummary
} from "@/src/types/models";
import { apiFetch, withJson } from "@/src/api/client";

interface CreateTripPayload {
  title: string;
  startDate: string;
  endDate: string;
  destination?: string;
}

interface FlightPayload {
  airline?: string;
  flightNumber?: string;
  departureTime?: string;
  arrivalTime?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  price?: number;
  confirmationCode?: string;
  notes?: string;
}

interface LodgingPayload extends Place {
  checkIn?: string;
  checkOut?: string;
  notes?: string;
}

export function getTrips() {
  return apiFetch<TripSummary[]>("/api/trips");
}

export function createTrip(payload: CreateTripPayload) {
  return apiFetch<TripSummary>("/api/trips", {
    method: "POST",
    ...withJson(payload)
  });
}

export function getTrip(tripId: string) {
  return apiFetch<Trip>(`/api/trips/${tripId}`);
}

export function searchPlaces(input: string, location?: { lat: number; lng: number }) {
  const params = new URLSearchParams({ input });
  if (location) {
    params.set("location", `${location.lat},${location.lng}`);
    params.set("radius", "50000");
  }

  return apiFetch<GoogleAutocompleteResponse>(`/api/google/autocomplete?${params.toString()}`);
}

export function getPlaceDetails(placeId: string) {
  const params = new URLSearchParams({ placeId });
  return apiFetch<GoogleDetailsResponse>(`/api/google/details?${params.toString()}`);
}

export function savePlaceToTrip(tripId: string, place: Place) {
  return apiFetch<Place>(`/api/trips/${tripId}/places`, {
    method: "POST",
    ...withJson(place)
  });
}

export function addPlaceToItinerary(tripId: string, dayIndex: number, placeId: string, startTime = "") {
  return apiFetch<{ success: boolean }>(`/api/trips/${tripId}/itinerary`, {
    method: "POST",
    ...withJson({
      dayIndex,
      item: {
        placeId,
        startTime
      }
    })
  });
}

export function removeItineraryItem(tripId: string, dayIndex: number, itemId: string) {
  const params = new URLSearchParams({ day: String(dayIndex), itemId });
  return apiFetch<{ success: boolean }>(`/api/trips/${tripId}/itinerary?${params.toString()}`, {
    method: "DELETE"
  });
}

export function createFlight(tripId: string, payload: FlightPayload) {
  return apiFetch<{ success: boolean }>(`/api/trips/${tripId}/flights`, {
    method: "POST",
    ...withJson(payload)
  });
}

export function deleteFlight(tripId: string, flightId: string) {
  return apiFetch<{ success: boolean }>(`/api/trips/${tripId}/flights/${flightId}`, {
    method: "DELETE"
  });
}

export function createLodging(tripId: string, payload: LodgingPayload) {
  return apiFetch<{ success: boolean }>(`/api/trips/${tripId}/lodging`, {
    method: "POST",
    ...withJson(payload)
  });
}

export function updateLodging(tripId: string, payload: { placeId: string; checkIn?: string; checkOut?: string; notes?: string }) {
  return apiFetch<{ success: boolean }>(`/api/trips/${tripId}/lodging`, {
    method: "PUT",
    ...withJson(payload)
  });
}

export function deleteLodging(tripId: string, lodgingId: string) {
  return apiFetch<{ success: boolean }>(`/api/trips/${tripId}/lodging/${lodgingId}`, {
    method: "DELETE"
  });
}

export function mapGoogleTypesToPlaceType(types: string[] = []): Place["type"] {
  if (types.includes("lodging")) return "lodging";
  if (types.includes("restaurant") || types.includes("food")) return "restaurant";
  if (types.includes("airport")) return "flight";
  return "activity";
}

export function extractCity(addressComponents: Array<{ long_name: string; types: string[] }> = []): string {
  const city = addressComponents.find((component) => component.types.includes("locality"));
  return city?.long_name ?? "";
}
