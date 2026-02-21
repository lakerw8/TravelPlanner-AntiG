"use client";

import type { Dispatch, SetStateAction } from "react";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Trip, Place, PlaceList } from "@/lib/types";

interface TripContextValue {
    trip: Trip | null;
    isLoading: boolean;
    error: string | null;
    lists: PlaceList[];
    refreshTrip: () => Promise<void>;
    updateTripLocally: (updater: (trip: Trip) => Trip) => void;
    // Map state shared between sidebar and map
    mapCenter: [number, number] | undefined;
    setMapCenter: (center: [number, number]) => void;
    selectedPlace: Place | null;
    setSelectedPlace: Dispatch<SetStateAction<Place | null>>;
}

const TripContext = createContext<TripContextValue | null>(null);

export function TripProvider({ tripId, children }: { tripId: string; children: ReactNode }) {
    const [trip, setTrip] = useState<Trip | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lists, setLists] = useState<PlaceList[]>([]);
    const [mapCenter, setMapCenter] = useState<[number, number] | undefined>(undefined);
    const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

    const refreshTrip = useCallback(async () => {
        try {
            const res = await fetch(`/api/trips/${tripId}`);
            if (!res.ok) throw new Error("Failed to fetch trip");
            const tripData: Trip = await res.json();
            setTrip(tripData);
            setLists(tripData.lists || []);
            setError(null);
            if (tripData.lat && tripData.lng) {
                setMapCenter((current) => current ?? [tripData.lat!, tripData.lng!]);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load trip");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [tripId]);

    useEffect(() => {
        setIsLoading(true);
        void refreshTrip();
    }, [refreshTrip]);

    const updateTripLocally = useCallback((updater: (trip: Trip) => Trip) => {
        setTrip((current) => {
            if (!current) return current;
            const updated = updater(current);
            setLists(updated.lists || []);
            return updated;
        });
    }, []);

    return (
        <TripContext value={{
            trip,
            isLoading,
            error,
            lists,
            refreshTrip,
            updateTripLocally,
            mapCenter,
            setMapCenter,
            selectedPlace,
            setSelectedPlace,
        }}>
            {children}
        </TripContext>
    );
}

export function useTripContext(): TripContextValue {
    const ctx = useContext(TripContext);
    if (!ctx) throw new Error("useTripContext must be used within TripProvider");
    return ctx;
}
