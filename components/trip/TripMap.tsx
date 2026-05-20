"use client";

import { GoogleMap, useJsApiLoader, MarkerF, PolylineF } from "@react-google-maps/api";
import { Place } from "@/lib/types";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { MapPin } from "lucide-react";
import { useTripContext } from "@/lib/contexts/TripContext";

// Global Window interface definition for global window variables (Leaflet and auth hook)
declare global {
    interface Window {
        gm_authFailure?: () => void;
        L?: any;
    }
}

interface TripMapProps {
    places: Place[];
    center?: [number, number]; // [lat, lng]
    selectedPlaceId?: string | null;
    onPlaceSelect?: (place: Place) => void;
    isCollapsed?: boolean;
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

// Helper to load Leaflet dynamically from CDN
function loadLeafletAssets(callback: () => void) {
    if (typeof window === 'undefined') return;
    if (window.L) {
        callback();
        return;
    }

    // 1. Inject Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
    }

    // 2. Inject Custom Tooltip overrides styles
    if (!document.getElementById('leaflet-custom-styles')) {
        const style = document.createElement('style');
        style.id = 'leaflet-custom-styles';
        style.innerHTML = `
            .leaflet-custom-tooltip {
                background-color: rgba(24, 24, 27, 0.95) !important;
                color: #ffffff !important;
                border: 1px solid rgba(255, 255, 255, 0.15) !important;
                border-radius: 6px !important;
                padding: 4px 8px !important;
                font-size: 11px !important;
                font-family: inherit !important;
                font-weight: 600 !important;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.3) !important;
            }
            .leaflet-custom-tooltip::before {
                border-top-color: rgba(24, 24, 27, 0.95) !important;
            }
            .leaflet-container {
                font-family: inherit !important;
                background-color: #f4f4f5 !important;
            }
            /* Smooth transitions for zoom/pan */
            .leaflet-fade-anim .leaflet-tile, .leaflet-zoom-anim .leaflet-zoom-animated {
                transition: transform 0.25s cubic-bezier(0,0,0.25,1), opacity 0.25s ease-in-out !important;
            }
            .leaflet-marker-active, .leaflet-marker-inactive {
                background: none !important;
                border: none !important;
            }
        `;
        document.head.appendChild(style);
    }

    // 3. Inject Leaflet JS
    const scriptId = 'leaflet-js';
    let script = document.getElementById(scriptId) as HTMLScriptElement;
    if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => callback();
        document.head.appendChild(script);
    } else {
        const checkL = setInterval(() => {
            if (window.L) {
                clearInterval(checkL);
                callback();
            }
        }, 50);
    }
}

interface LeafletMapProps {
    places: Place[];
    center?: [number, number];
    selectedPlaceId?: string | null;
    onPlaceSelect?: (place: Place) => void;
    mapRoutes: MapDayRoute[];
    inactivePlaces: Place[];
    initialCenter: { lat: number; lng: number };
    isCollapsed?: boolean;
}

function LeafletMap({
    places,
    center,
    selectedPlaceId,
    onPlaceSelect,
    mapRoutes,
    inactivePlaces,
    initialCenter,
    isCollapsed
}: LeafletMapProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const layersRef = useRef<any>(null);
    const [leafletLoaded, setLeafletLoaded] = useState(false);

    // Initialize Leaflet scripts
    useEffect(() => {
        loadLeafletAssets(() => {
            setLeafletLoaded(true);
        });
    }, []);

    // Initialize map container once loaded
    useEffect(() => {
        if (!leafletLoaded || !containerRef.current || mapRef.current) return;

        const L = window.L;
        if (!L) return;

        // Initialize Map
        const map = L.map(containerRef.current, {
            zoomControl: false,
            attributionControl: true
        }).setView([initialCenter.lat, initialCenter.lng], 12);

        // Add custom zoom control
        L.control.zoom({
            position: 'bottomright'
        }).addTo(map);

        // Add CartoDB Positron tiles (light-mode maps with minimal POIs)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(map);

        // Add a layer group to hold all active markers and lines
        const layers = L.layerGroup().addTo(map);
        
        mapRef.current = map;
        layersRef.current = layers;

        // Force relayout after initial render to avoid grey tile issue
        setTimeout(() => {
            map.invalidateSize();
        }, 100);

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
                layersRef.current = null;
            }
        };
    }, [leafletLoaded, initialCenter]);

    // Handle container resize when expanding
    useEffect(() => {
        const map = mapRef.current;
        if (!map || isCollapsed) return;

        const handleResize = () => {
            map.invalidateSize();
        };

        window.addEventListener("resize", handleResize);
        // Immediate invalidate to catch the state transition
        setTimeout(() => {
            map.invalidateSize();
        }, 50);

        return () => window.removeEventListener("resize", handleResize);
    }, [isCollapsed]);

    // Redraw markers, routes and fit bounds when points change
    useEffect(() => {
        const map = mapRef.current;
        const layers = layersRef.current;
        const L = window.L;

        if (!map || !layers || !L || isCollapsed) return;

        // Clear existing markers and lines
        layers.clearLayers();

        const bounds: any[] = [];

        // 1. Add Inactive Places (Wishlist items - sleek dark/grey dots)
        inactivePlaces.forEach((place) => {
            if (place.lat && place.lng) {
                const inactiveIcon = L.divIcon({
                    html: `<div class="w-3.5 h-3.5 rounded-full bg-zinc-500/75 border border-white shadow-sm flex items-center justify-center cursor-pointer transition-transform hover:scale-125"></div>`,
                    className: 'leaflet-marker-inactive',
                    iconSize: [14, 14],
                    iconAnchor: [7, 7]
                });

                const marker = L.marker([place.lat, place.lng], { icon: inactiveIcon })
                    .addTo(layers)
                    .on('click', () => onPlaceSelect?.(place));

                marker.bindTooltip(place.name, {
                    direction: 'top',
                    className: 'leaflet-custom-tooltip',
                    offset: [0, -5]
                });

                bounds.push([place.lat, place.lng]);
            }
        });

        // 2. Add Route Polylines for each day
        mapRoutes.forEach((route) => {
            if (route.polylinePath.length > 1) {
                const latlngs = route.polylinePath.map(pt => [pt.lat, pt.lng]);
                L.polyline(latlngs, {
                    color: route.color, // Color of that specific day
                    weight: 4.5,
                    opacity: 0.85,
                    lineJoin: 'round'
                }).addTo(layers);
            }
        });

        // 3. Add Active Places (numbered color-coded circles) and Starting Hotels
        mapRoutes.forEach((route) => {
            // Draw active hotel starting marker if one is set for the day and there are destinations
            if (route.activeHotel && route.activeHotel.lat !== undefined && route.activeHotel.lng !== undefined && route.activeHotel.lat !== null && route.activeHotel.lng !== null && route.points.length > 0) {
                const hotelIcon = L.divIcon({
                    html: `<div class="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white font-black text-xs shadow-md cursor-pointer transition-all hover:scale-110 hover:brightness-110" style="background-color: ${route.color};">🏨</div>`,
                    className: 'leaflet-marker-active',
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                });

                const marker = L.marker([route.activeHotel.lat, route.activeHotel.lng], { icon: hotelIcon, zIndexOffset: 1000 + route.dayIndex * 50 })
                    .addTo(layers)
                    .on('click', () => onPlaceSelect?.(route.activeHotel!));

                marker.bindTooltip(`<strong>Start: ${route.activeHotel.name}</strong>`, {
                    direction: 'top',
                    className: 'leaflet-custom-tooltip',
                    offset: [0, -12]
                });

                bounds.push([route.activeHotel.lat, route.activeHotel.lng]);
            }

            route.points.forEach((pt) => {
                const activeIcon = L.divIcon({
                    html: `<div class="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white font-black text-xs shadow-md cursor-pointer transition-all hover:scale-110 hover:brightness-110" style="background-color: ${route.color};">${pt.index}</div>`,
                    className: 'leaflet-marker-active',
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                });

                const marker = L.marker([pt.lat, pt.lng], { icon: activeIcon, zIndexOffset: 1000 + route.dayIndex * 50 + pt.index })
                    .addTo(layers)
                    .on('click', () => onPlaceSelect?.(pt.place));

                marker.bindTooltip(`<strong>${pt.index}. ${pt.place.name}</strong>`, {
                    direction: 'top',
                    className: 'leaflet-custom-tooltip',
                    offset: [0, -12]
                });

                bounds.push([pt.lat, pt.lng]);
            });
        });

        // 4. Fit bounds elegantly
        if (bounds.length > 0) {
            map.fitBounds(bounds, {
                padding: [50, 50],
                maxZoom: 15,
                animate: true,
                duration: 0.75
            });
        }
    }, [leafletLoaded, mapRoutes, inactivePlaces, onPlaceSelect, isCollapsed]);

    // Handle selectedPlaceId prop syncing
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !selectedPlaceId || isCollapsed) return;

        const targetPlace = places.find(p => p.id === selectedPlaceId);
        if (targetPlace?.lat && targetPlace.lng) {
            map.setView([targetPlace.lat, targetPlace.lng], 15, {
                animate: true,
                duration: 0.5
            });
        }
    }, [selectedPlaceId, places, isCollapsed]);

    // Handle center prop syncing
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !center || isCollapsed) return;

        map.setView([center[0], center[1]], map.getZoom(), {
            animate: true,
            duration: 0.5
        });
    }, [center, isCollapsed]);

    if (!leafletLoaded) {
        return (
            <div className="w-full h-full bg-surface flex flex-col items-center justify-center text-muted">
                <div className="w-8 h-8 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-3"></div>
                <span className="text-sm font-medium">Loading Interactive Map Layer...</span>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full">
            {/* Status Badge overlay */}
            <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-[1000] bg-zinc-950/85 backdrop-blur-md border border-amber-500/40 text-amber-400 text-[10px] sm:text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 pointer-events-none font-semibold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_#f59e0b]" />
                <span>Offline-Friendly Map Fallback</span>
            </div>

            <div ref={containerRef} className="w-full h-full z-10" />
        </div>
    );
}

const DAY_COLORS = [
    "#D4AF37", // Day 1: Luxury Gold
    "#F43F5E", // Day 2: Vibrant Rose
    "#14B8A6", // Day 3: Emerald Teal
    "#8B5CF6", // Day 4: Royal Violet
    "#3B82F6", // Day 5: Electric Blue
    "#F97316", // Day 6: Sunny Orange
    "#EC4899", // Day 7: Hot Pink
    "#10B981"  // Day 8: Jade Green
];
const getDayColor = (dayIndex: number) => {
    return DAY_COLORS[dayIndex % DAY_COLORS.length];
};

interface MapRoutePoint {
    place: Place;
    lat: number;
    lng: number;
    index: number;
    dayIndex: number;
    color: string;
}

interface MapDayRoute {
    dayIndex: number;
    color: string;
    points: MapRoutePoint[];
    polylinePath: { lat: number; lng: number }[];
    activeHotel?: Place | null;
}

export default function TripMap({ places, center, selectedPlaceId, onPlaceSelect, isCollapsed }: TripMapProps) {
    const hasApiKey = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
    const { trip, activeDayIndex, setActiveDayIndex } = useTripContext();
    const [isGoogleAuthFailed, setIsGoogleAuthFailed] = useState(false);

    // Setup global gm_authFailure handler
    useEffect(() => {
        if (typeof window !== "undefined") {
            const prevHandler = window.gm_authFailure;
            window.gm_authFailure = () => {
                console.warn("Google Maps API authentication failed! Switching to Leaflet fallback map.");
                setIsGoogleAuthFailed(true);
                if (prevHandler) {
                    try { prevHandler(); } catch (e) {}
                }
            };
        }
    }, []);

    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
    });

    const [map, setMap] = useState<google.maps.Map | null>(null);

    // Compute active day routes with custom colors and sequence numbering
    const mapRoutes = useMemo<MapDayRoute[]>(() => {
        if (!trip) return [];

        return trip.itinerary.map((day, dIndex) => {
            const color = getDayColor(dIndex);
            const points: MapRoutePoint[] = [];
            let indexCounter = 1;

            if (day.items) {
                day.items.forEach((item) => {
                    const place = trip.places[item.placeId];
                    if (place && place.lat !== undefined && place.lng !== undefined && place.lat !== null && place.lng !== null) {
                        points.push({
                            place,
                            lat: place.lat,
                            lng: place.lng,
                            index: indexCounter++,
                            dayIndex: dIndex,
                            color
                        });
                    }
                });
            }

            // Find active hotel for this day (if any)
            let activeHotel: Place | null = null;
            if (trip && trip.places) {
                for (const place of Object.values(trip.places)) {
                    if (place.type === "lodging" && place.checkIn && place.checkOut) {
                        const inDate = place.checkIn.substring(0, 10);
                        const outDate = place.checkOut.substring(0, 10);
                        if (day.date > inDate && day.date <= outDate && place.lat !== undefined && place.lng !== undefined && place.lat !== null && place.lng !== null) {
                            activeHotel = place;
                            break;
                        }
                    }
                }
            }

            const polylinePath = points.map(pt => ({ lat: pt.lat, lng: pt.lng }));
            if (activeHotel && activeHotel.lat !== undefined && activeHotel.lng !== undefined && activeHotel.lat !== null && activeHotel.lng !== null && points.length > 0) {
                polylinePath.unshift({ lat: activeHotel.lat, lng: activeHotel.lng });
            }

            return {
                dayIndex: dIndex,
                color,
                points,
                polylinePath,
                activeHotel
            };
        }).filter(route => {
            if (activeDayIndex === null) return true; // show all days
            return route.dayIndex === activeDayIndex; // show only active day
        });
    }, [trip, activeDayIndex]);

    // Inactive places: places that are not in any of the active/rendered day's routes
    const inactivePlaces = useMemo(() => {
        const activeIds = new Set<string>();
        mapRoutes.forEach((route) => {
            route.points.forEach((pt) => {
                activeIds.add(pt.place.id);
            });
            if (route.activeHotel) {
                activeIds.add(route.activeHotel.id);
            }
        });
        return places.filter((p) => !activeIds.has(p.id) && p.lat && p.lng);
    }, [places, mapRoutes]);

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

    // Sync selectedPlaceId prop with internal state (Google Map)
    useEffect(() => {
        if (!selectedPlaceId || !map || isGoogleAuthFailed || isCollapsed) return;

        const place = places.find((candidate) => candidate.id === selectedPlaceId);
        if (place?.lat && place.lng) {
            map.panTo({ lat: place.lat, lng: place.lng });
            map.setZoom(15);
        }
    }, [selectedPlaceId, places, map, isGoogleAuthFailed, isCollapsed]);

    // Handle center prop changes (Google Map)
    useEffect(() => {
        if (map && center && !isGoogleAuthFailed && !isCollapsed) {
            map.panTo({ lat: center[0], lng: center[1] });
        }
    }, [center, map, isGoogleAuthFailed, isCollapsed]);

    // Fit map bounds to active day route points when activeDayIndex changes (Google Map)
    useEffect(() => {
        if (!map || isGoogleAuthFailed || isCollapsed) return;

        const bounds = new window.google.maps.LatLngBounds();
        let pointCount = 0;

        mapRoutes.forEach((route) => {
            route.points.forEach((pt) => {
                bounds.extend({ lat: pt.lat, lng: pt.lng });
                pointCount++;
            });
        });

        // Also add inactive places if there are no active routes
        if (pointCount === 0) {
            places.forEach((p) => {
                if (p.lat && p.lng) {
                    bounds.extend({ lat: p.lat, lng: p.lng });
                    pointCount++;
                }
            });
        }

        if (pointCount > 0) {
            map.fitBounds(bounds);
            
            // Limit zoom to a comfortable level if it's a single marker
            if (pointCount === 1) {
                const listener = window.google.maps.event.addListener(map, 'bounds_changed', () => {
                    if (map.getZoom()! > 15) map.setZoom(15);
                    window.google.maps.event.removeListener(listener);
                });
            }
        }
    }, [mapRoutes, places, map, isGoogleAuthFailed]);

    const onLoad = useCallback(function callback(map: google.maps.Map) {
        setMap(map);
    }, []);

    const onUnmount = useCallback(function callback() {
        setMap(null);
    }, []);

    // Helper markers
    const getActiveMarkerSymbol = useCallback((label: number, color: string) => {
        if (typeof window === "undefined" || !window.google) return undefined;
        return {
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: color, // Custom day color
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: "#FFFFFF",
            scale: 13,
            labelOrigin: new window.google.maps.Point(0, 0),
        };
    }, []);

    const getInactiveMarkerSymbol = useCallback(() => {
        if (typeof window === "undefined" || !window.google) return undefined;
        return {
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: "#78716c", // Neutral Muted Grey
            fillOpacity: 0.5,
            strokeWeight: 1.5,
            strokeColor: "#FFFFFF",
            scale: 6,
        };
    }, []);

    // If API key is missing or loaded fails or auth fails, use the beautiful LeafletMap fallback
    const showFallback = !hasApiKey || isGoogleAuthFailed || Boolean(loadError);

    return (
        <div className="relative w-full h-full">
            {/* Glassmorphic Day Selector Panel */}
            {trip && trip.itinerary.length > 0 && (
                <div className="absolute top-4 left-4 z-[999] max-w-[calc(100%-2rem)] flex items-center gap-1.5 p-1 bg-zinc-950/70 backdrop-blur-md border border-white/10 rounded-full shadow-2xl overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveDayIndex(null)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeDayIndex === null ? "bg-primary text-white shadow-md shadow-primary/30 border border-primary/20 scale-[1.03]" : "text-white/70 hover:text-white hover:bg-white/10"}`}
                    >
                        <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-amber-400 via-rose-400 to-teal-400 animate-pulse shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
                        All Days
                    </button>
                    {trip.itinerary.map((day, idx) => (
                        <button
                            key={idx}
                            onClick={() => setActiveDayIndex(idx)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeDayIndex === idx ? "bg-primary text-white shadow-md shadow-primary/30 border border-primary/20 scale-[1.03]" : "text-white/70 hover:text-white hover:bg-white/10"}`}
                        >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getDayColor(idx) }} />
                            Day {idx + 1}
                        </button>
                    ))}
                </div>
            )}

            {showFallback ? (
                <LeafletMap
                    places={places}
                    center={center}
                    selectedPlaceId={selectedPlaceId}
                    onPlaceSelect={onPlaceSelect}
                    mapRoutes={mapRoutes}
                    inactivePlaces={inactivePlaces}
                    initialCenter={initialCenter}
                    isCollapsed={isCollapsed}
                />
            ) : (
                !isLoaded ? (
                    <div className="w-full h-full bg-surface flex items-center justify-center text-muted">Loading Map...</div>
                ) : (
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
                        {/* 1. Inactive places (background details) */}
                        {inactivePlaces.map((place) => (
                            place.lat && place.lng && (
                                <MarkerF
                                    key={`inactive-${place.id}`}
                                    position={{ lat: place.lat, lng: place.lng }}
                                    onClick={() => {
                                        onPlaceSelect?.(place);
                                    }}
                                    icon={getInactiveMarkerSymbol()}
                                    zIndex={50}
                                />
                            )
                        ))}

                        {/* 2. Active Routes polyline paths */}
                        {mapRoutes.map((route) => (
                            route.polylinePath.length > 1 && (
                                <PolylineF
                                    key={`polyline-day-${route.dayIndex}`}
                                    path={route.polylinePath}
                                    options={{
                                        strokeColor: route.color,
                                        strokeOpacity: 0.85,
                                        strokeWeight: 4.5,
                                        geodesic: true,
                                    }}
                                />
                            )
                        ))}

                        {/* 3. Active starting hotel markers */}
                        {mapRoutes.map((route) => (
                            route.activeHotel && route.activeHotel.lat !== undefined && route.activeHotel.lng !== undefined && route.activeHotel.lat !== null && route.activeHotel.lng !== null && route.points.length > 0 && (
                                <MarkerF
                                    key={`hotel-active-day-${route.dayIndex}`}
                                    position={{ lat: route.activeHotel.lat, lng: route.activeHotel.lng }}
                                    onClick={() => {
                                        onPlaceSelect?.(route.activeHotel!);
                                    }}
                                    icon={getActiveMarkerSymbol(0, route.color)}
                                    label={{
                                        text: "🏨",
                                        color: "#FFFFFF",
                                        fontSize: "12px",
                                        fontWeight: "800",
                                    }}
                                    zIndex={100 + route.dayIndex * 20}
                                />
                            )
                        ))}

                        {/* 4. Active day route places (numbered color-coded pins) */}
                        {mapRoutes.flatMap((route) => 
                            route.points.map((pt) => (
                                <MarkerF
                                    key={`active-${pt.place.id}-day-${route.dayIndex}-${pt.index}`}
                                    position={{ lat: pt.lat, lng: pt.lng }}
                                    onClick={() => {
                                        onPlaceSelect?.(pt.place);
                                    }}
                                    icon={getActiveMarkerSymbol(pt.index, route.color)}
                                    label={{
                                        text: String(pt.index),
                                        color: "#FFFFFF",
                                        fontSize: "11px",
                                        fontWeight: "800",
                                    }}
                                    zIndex={100 + route.dayIndex * 20 + pt.index}
                                />
                            ))
                        )}
                    </GoogleMap>
                )
            )}
        </div>
    );
}
