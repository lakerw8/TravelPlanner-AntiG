"use client";

import { useCallback, useEffect, useState, use } from "react";
import { Place, ItineraryItem } from "@/lib/types";
import dynamic from "next/dynamic";
import { EditItemModal } from "@/components/trip/EditItemModal";
import { EditLodgingModal } from "@/components/trip/EditLodgingModal";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { PlaceDetailCard } from "@/components/trip/PlaceDetailCard";
import { TripHeader } from "@/components/trip/TripHeader";
import { SavedPlacesPanel } from "@/components/trip/SavedPlacesPanel";
import { ItineraryPanel } from "@/components/trip/ItineraryPanel";
import { useTripContext } from "@/lib/contexts/TripContext";
import { useToast } from "@/lib/contexts/ToastContext";
import { useConfirm } from "@/components/ui/ConfirmDialog";

const TripMap = dynamic(() => import("@/components/trip/TripMap"), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-surface flex items-center justify-center text-muted">Loading Map...</div>,
});

interface GoogleDetailsRouteResult {
    formatted_address?: string;
    rating?: number;
    user_ratings_total?: number;
    photos?: Array<{ photo_reference?: string }>;
    price_level?: number;
    website?: string;
    geometry?: { location?: { lat?: number; lng?: number } };
    editorial_summary?: { overview?: string };
    opening_hours?: { weekday_text?: string[] };
    current_opening_hours?: { weekday_text?: string[] };
    formatted_phone_number?: string;
    international_phone_number?: string;
}

interface GoogleDetailsRouteResponse {
    result?: GoogleDetailsRouteResult;
}

export default function TripPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { trip, refreshTrip, updateTripLocally, mapCenter, setMapCenter, selectedPlace, setSelectedPlace } = useTripContext();
    const { toast } = useToast();
    const confirm = useConfirm();

    const [editingItem, setEditingItem] = useState<{ dayIndex: number; item: ItineraryItem; place: Place } | null>(null);
    const [editingLodging, setEditingLodging] = useState<{ place: Place; checkIn?: string; checkOut?: string } | null>(null);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [activeListId, setActiveListId] = useState<string | null>(null);

    useEffect(() => {
        const handleScrollRequest = (event: Event) => {
            const customEvent = event as CustomEvent<{ sectionId?: string }>;
            const sectionId = customEvent.detail?.sectionId;
            if (!sectionId) return;
            document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
        };
        window.addEventListener("trip:scroll-to-section", handleScrollRequest as EventListener);
        return () => window.removeEventListener("trip:scroll-to-section", handleScrollRequest as EventListener);
    }, []);

    const hydratePlaceDetailsFromGoogle = useCallback(async (place: Place) => {
        if (!place.googlePlaceId) return;
        try {
            const res = await fetch(`/api/google/details?placeId=${encodeURIComponent(place.googlePlaceId)}`);
            if (!res.ok) return;
            const data = await res.json() as GoogleDetailsRouteResponse;
            const result = data.result;
            if (!result) return;

            const fallbackPhoto = result.photos?.[0]?.photo_reference
                ? `/api/google/photo?reference=${encodeURIComponent(result.photos[0].photo_reference)}&maxwidth=400`
                : undefined;
            const openingHours =
                (place.openingHours && place.openingHours.length > 0)
                    ? place.openingHours
                    : (result.opening_hours?.weekday_text ?? result.current_opening_hours?.weekday_text);

            const hydratedPlace: Place = {
                ...place,
                address: place.address ?? result.formatted_address,
                rating: place.rating ?? result.rating,
                userRatingsTotal: place.userRatingsTotal ?? result.user_ratings_total,
                image: place.image || fallbackPhoto,
                priceLevel: place.priceLevel ?? result.price_level,
                website: place.website ?? result.website,
                lat: place.lat ?? result.geometry?.location?.lat,
                lng: place.lng ?? result.geometry?.location?.lng,
                openingHours,
                editorialSummary: place.editorialSummary ?? result.editorial_summary?.overview,
                formattedPhoneNumber: place.formattedPhoneNumber ?? result.formatted_phone_number ?? result.international_phone_number,
            };

            setSelectedPlace((current) => {
                if (!current || current.id !== place.id) return current;
                return hydratedPlace;
            });

            updateTripLocally((t) => {
                if (!t.places[place.id]) return t;
                return { ...t, places: { ...t.places, [place.id]: { ...t.places[place.id], ...hydratedPlace } } };
            });
        } catch {
            // Silently fail - hydration is best-effort
        }
    }, [setSelectedPlace, updateTripLocally]);

    const focusPlaceOnMap = useCallback((place: Place) => {
        setSelectedPlace(place);
        if (place.lat && place.lng) setMapCenter([place.lat, place.lng]);
        if ((!place.openingHours || place.openingHours.length === 0) && place.googlePlaceId) {
            void hydratePlaceDetailsFromGoogle(place);
        }
    }, [setSelectedPlace, setMapCenter, hydratePlaceDetailsFromGoogle]);

    const handlePlaceSelect = async (place: Place) => {
        if (place.type === "lodging") {
            toast({ type: "info", message: "Use the Lodging menu to add hotels so dates and edits are managed there." });
            return;
        }
        try {
            const placeRes = await fetch(`/api/trips/${id}/places`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(place),
            });
            const savedPlace = await placeRes.json() as Place;
            const canonicalPlace: Place = savedPlace.id ? savedPlace : place;

            if (activeListId) {
                await fetch(`/api/trips/${id}/lists/${activeListId}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ placeId: canonicalPlace.id }),
                });
            }

            if (canonicalPlace.lat && canonicalPlace.lng) setMapCenter([canonicalPlace.lat, canonicalPlace.lng]);
            setSelectedPlace(canonicalPlace);
            if ((!canonicalPlace.openingHours || canonicalPlace.openingHours.length === 0) && canonicalPlace.googlePlaceId) {
                void hydratePlaceDetailsFromGoogle(canonicalPlace);
            }
            toast({ type: "success", message: `Added "${canonicalPlace.name}"` });
            await refreshTrip();
        } catch {
            toast({ type: "error", message: "Failed to add place" });
        }
    };

    const handleRemoveItem = async (dayIndex: number, item: ItineraryItem) => {
        const ok = await confirm({ title: "Remove item?", message: "Remove this item from your itinerary?", confirmLabel: "Remove", danger: true });
        if (!ok) return;

        if (item.itemType === "flight" && item.sourceId) {
            await fetch(`/api/trips/${id}/flights/${item.sourceId}`, { method: "DELETE" });
            toast({ type: "success", message: "Flight removed" });
            await refreshTrip();
            return;
        }
        if (item.itemType === "lodging" && item.sourceId) {
            await fetch(`/api/trips/${id}/lodging/${item.sourceId}`, { method: "DELETE" });
            toast({ type: "success", message: "Lodging removed" });
            await refreshTrip();
            return;
        }

        await fetch(`/api/trips/${id}/itinerary?day=${dayIndex}&itemId=${item.id}`, { method: "DELETE" });
        toast({ type: "success", message: "Item removed" });
        await refreshTrip();
    };

    const onDragEnd = async (result: DropResult) => {
        const { source, destination, draggableId } = result;
        if (!destination || !trip) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        if (source.droppableId === "sidebar-list" && destination.droppableId.startsWith("day-")) {
            const destDayIndex = Number.parseInt(destination.droppableId.replace("day-", ""), 10);
            await fetch(`/api/trips/${id}/itinerary`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ dayIndex: destDayIndex, item: { placeId: draggableId, startTime: "" } }),
            });
            toast({ type: "success", message: `Added to Day ${destDayIndex + 1}` });
            await refreshTrip();
            return;
        }

        if (source.droppableId.startsWith("day-") && destination.droppableId.startsWith("day-")) {
            const sourceDayIndex = Number.parseInt(source.droppableId.replace("day-", ""), 10);
            const destDayIndex = Number.parseInt(destination.droppableId.replace("day-", ""), 10);
            try {
                await fetch(`/api/trips/${id}/itinerary/reorder`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ itemId: draggableId, sourceDayIndex, sourceIndex: source.index, destDayIndex, destIndex: destination.index }),
                });
            } catch {
                toast({ type: "error", message: "Failed to reorder" });
            }
            await refreshTrip();
        }

        setSelectedItems(new Set());
    };

    if (!trip) return <div className="p-12 text-center text-muted">Loading Trip...</div>;

    return (
        <div className="flex flex-col flex-1 w-full h-full bg-background overflow-hidden relative">
            <TripHeader onPlaceSelect={handlePlaceSelect} />

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex-1 overflow-hidden flex flex-row relative min-h-0 w-full">
                    <div className="w-full lg:w-[500px] xl:w-[600px] h-full overflow-y-auto border-r border-accent bg-surface/30 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] z-10 custom-scrollbar relative scroll-smooth">
                        <div className="p-6 pb-32 space-y-8">
                            <SavedPlacesPanel
                                tripId={id}
                                activeListId={activeListId}
                                setActiveListId={setActiveListId}
                                onFocusPlace={focusPlaceOnMap}
                            />

                            <hr className="border-accent" />

                            <ItineraryPanel
                                tripId={id}
                                selectedItems={selectedItems}
                                onToggleSelection={(itemId) => {
                                    const next = new Set(selectedItems);
                                    if (next.has(itemId)) next.delete(itemId);
                                    else next.add(itemId);
                                    setSelectedItems(next);
                                }}
                                onClearSelection={() => setSelectedItems(new Set())}
                                onEditItem={(dayIndex, item, place) => setEditingItem({ dayIndex, item, place })}
                                onEditLodging={(place) => setEditingLodging({ place, checkIn: place.checkIn, checkOut: place.checkOut })}
                                onRemoveItem={handleRemoveItem}
                                onFocusPlace={focusPlaceOnMap}
                            />
                        </div>
                    </div>

                    <div className="hidden lg:block flex-1 relative bg-gray-100 min-h-0 h-full">
                        <div className="absolute inset-0 w-full h-full border-2 border-transparent">
                            <TripMap
                                places={Object.values(trip.places)}
                                center={mapCenter}
                                selectedPlaceId={selectedPlace?.id}
                                onPlaceSelect={focusPlaceOnMap}
                            />
                        </div>

                        {selectedPlace && (
                            <div className="absolute bottom-6 left-6 right-6 lg:max-w-md lg:mx-auto z-[1000] flex justify-center pointer-events-none">
                                <div className="pointer-events-auto w-full max-w-md">
                                    <PlaceDetailCard
                                        place={selectedPlace}
                                        onClose={() => setSelectedPlace(null)}
                                        onAdd={handlePlaceSelect}
                                        isAdded={!!trip.places[selectedPlace.id]}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </DragDropContext>

            {editingItem && (
                <EditItemModal
                    isOpen={!!editingItem}
                    onClose={(refresh) => {
                        setEditingItem(null);
                        if (refresh) refreshTrip();
                    }}
                    item={editingItem.item}
                    place={editingItem.place}
                    tripId={id}
                    dayIndex={editingItem.dayIndex}
                />
            )}

            {editingLodging && (
                <EditLodgingModal
                    isOpen={!!editingLodging}
                    onClose={(refresh) => {
                        setEditingLodging(null);
                        if (refresh) refreshTrip();
                    }}
                    tripId={id}
                    place={editingLodging.place}
                    currentCheckIn={editingLodging.checkIn}
                    currentCheckOut={editingLodging.checkOut}
                />
            )}
        </div>
    );
}
