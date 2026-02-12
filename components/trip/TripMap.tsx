"use client";

import { GoogleMap, useJsApiLoader, MarkerF } from "@react-google-maps/api";
import { Place } from "@/lib/types";
import { useEffect, useState, useMemo, useCallback } from "react";
import { MapPin } from "lucide-react";

interface TripMapProps {
    places: Place[];
    center?: [number, number]; // [lat, lng]
    selectedPlaceId?: string | null;
    onPlaceSelect?: (place: Place) => void;
}

const containerStyle = {
    width: '100%',
    height: '100%'
};

// Custom map styles to hide generic POIs and make it look clean
const mapStyles = [
    {
        featureType: "poi",
        elementType: "labels",
        stylers: [{ visibility: "off" }]
    },
    {
        featureType: "transit",
        elementType: "labels",
        stylers: [{ visibility: "off" }]
    }
];

export default function TripMap({ places, center, selectedPlaceId, onPlaceSelect }: TripMapProps) {
    const hasApiKey = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
    });

    const [map, setMap] = useState<google.maps.Map | null>(null);
    // Sync selectedPlaceId prop with internal state
    useEffect(() => {
        if (!selectedPlaceId || !map) return;

        const place = places.find((candidate) => candidate.id === selectedPlaceId);
        if (place?.lat && place.lng) {
            map.panTo({ lat: place.lat, lng: place.lng });
            map.setZoom(15);
        }
    }, [selectedPlaceId, places, map]);

    // Handle center prop changes
    useEffect(() => {
        if (map && center) {
            map.panTo({ lat: center[0], lng: center[1] });
        }
    }, [center, map]);

    const onLoad = useCallback(function callback(map: google.maps.Map) {
        setMap(map);
    }, []);

    const onUnmount = useCallback(function callback() {
        setMap(null);
    }, []);

    // Calculate initial center
    const defaultCenter = useMemo(() => ({ lat: 35.6762, lng: 139.6503 }), []);
    const initialCenter = useMemo(() => {
        if (center) return { lat: center[0], lng: center[1] };
        if (places.length > 0) {
            const first = places.find(p => p.lat && p.lng);
            if (first && first.lat && first.lng) return { lat: first.lat, lng: first.lng };
        }
        return defaultCenter;
    }, [center, places, defaultCenter]);

    if (!hasApiKey) {
        console.error("Google Maps API Key is missing. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local");
        return (
            <div className="w-full h-full bg-surface flex flex-col items-center justify-center text-muted p-4 text-center">
                <MapPin size={32} className="mb-2 opacity-50" />
                <p className="font-bold">Map Cannot Load</p>
                <p className="text-xs">API Key configuration missing</p>
            </div>
        );
    }

    if (!isLoaded) return <div className="w-full h-full bg-surface flex items-center justify-center text-muted">Loading Map...</div>;

    return (
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={initialCenter}
            zoom={12}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={{
                styles: mapStyles,
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
                zoomControl: true,
            }}
        >
            {places.map((place) => (
                place.lat && place.lng && (
                    <MarkerF
                        key={place.id}
                        position={{ lat: place.lat, lng: place.lng }}
                        onClick={() => {
                            onPlaceSelect?.(place);
                            if (map) {
                                map.panTo({ lat: place.lat!, lng: place.lng! });
                            }
                        }}
                        // Use default marker for now, can customize later
                        opacity={selectedPlaceId && selectedPlaceId !== place.id ? 0.6 : 1.0}
                    />
                )
            ))}
        </GoogleMap>
    );
}
