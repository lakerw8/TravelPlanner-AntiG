"use client";

import { Place } from "@/lib/types";
import { PlaceAutocomplete } from "@/components/trip/PlaceAutocomplete";
import { formatDateOnly } from "@/lib/date";
import { useTripContext } from "@/lib/contexts/TripContext";

interface TripHeaderProps {
    onPlaceSelect: (place: Place) => void;
}

export function TripHeader({ onPlaceSelect }: TripHeaderProps) {
    const { trip } = useTripContext();

    if (!trip) return null;

    return (
        <header className="px-6 py-4 bg-surface border-b border-accent flex items-center gap-6 shrink-0 z-40 shadow-sm relative">
            <div className="flex-1 max-w-2xl mx-auto">
                <PlaceAutocomplete
                    onSelect={onPlaceSelect}
                    tripLocation={trip.lat && trip.lng ? { lat: trip.lat, lng: trip.lng } : undefined}
                    placeholder={`Search for places in ${trip.title.replace("Trip to ", "")}...`}
                    className="w-full"
                />
            </div>
            <div className="hidden lg:block text-right">
                <h1 className="text-lg font-display font-bold text-text truncate max-w-[200px]">{trip.title}</h1>
                <p className="text-xs text-muted">
                    {formatDateOnly(trip.startDate)} - {formatDateOnly(trip.endDate)}
                </p>
            </div>
        </header>
    );
}
