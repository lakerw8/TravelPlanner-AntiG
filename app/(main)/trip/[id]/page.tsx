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
import { PanelLeftOpen, PanelRightOpen, PanelRightClose } from "lucide-react";
import { useTripContext } from "@/lib/contexts/TripContext";
import { useToast } from "@/lib/contexts/ToastContext";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

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

    // Collapsed panels state management
    const [isListsCollapsed, setIsListsCollapsed] = useState(false);
    const [isItineraryCollapsed, setIsItineraryCollapsed] = useState(false);
    const [isMapCollapsed, setIsMapCollapsed] = useState(false);

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

    useEffect(() => {
        if (!isMapCollapsed) {
            // Trigger a global window resize event to let Leaflet/Google Map adjust their container sizes perfectly.
            window.dispatchEvent(new Event("resize"));
        }
    }, [isMapCollapsed]);

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
            if (!placeRes.ok) {
                throw new Error("Server failed to save place");
            }
            const savedPlace = await placeRes.json() as Place;
            const canonicalPlace: Place = savedPlace.id ? savedPlace : place;

            if (activeListId) {
                const listRes = await fetch(`/api/trips/${id}/lists/${activeListId}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ placeId: canonicalPlace.id }),
                });
                if (!listRes.ok) {
                    throw new Error("Server failed to add to custom list");
                }
            }

            if (canonicalPlace.lat && canonicalPlace.lng) setMapCenter([canonicalPlace.lat, canonicalPlace.lng]);
            setSelectedPlace(canonicalPlace);
            if ((!canonicalPlace.openingHours || canonicalPlace.openingHours.length === 0) && canonicalPlace.googlePlaceId) {
                void hydratePlaceDetailsFromGoogle(canonicalPlace);
            }
            toast({ type: "success", message: `Saved "${canonicalPlace.name}" to wishlist` });
            await refreshTrip();
        } catch (err) {
            console.error("Error in handlePlaceSelect:", err);
            toast({ type: "error", message: err instanceof Error ? err.message : "Failed to add place" });
        }
    };

    const handleAddToItinerary = async (place: Place, dayIndex: number) => {
        try {
            let canonicalPlaceId = Object.values(trip.places).find(
                (p) =>
                    (p.googlePlaceId && p.googlePlaceId === place.googlePlaceId) ||
                    p.id === place.id
            )?.id;

            if (!canonicalPlaceId) {
                const placeRes = await fetch(`/api/trips/${id}/places`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(place),
                });
                if (!placeRes.ok) {
                    throw new Error("Failed to save place to database");
                }
                const savedPlace = await placeRes.json() as Place;
                if (!savedPlace.id) {
                    throw new Error("Failed to save place - missing ID in response");
                }
                canonicalPlaceId = savedPlace.id;
            }

            const itineraryRes = await fetch(`/api/trips/${id}/itinerary`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    dayIndex,
                    item: {
                        placeId: canonicalPlaceId,
                        startTime: "",
                    },
                }),
            });

            if (!itineraryRes.ok) {
                throw new Error("Failed to add to itinerary");
            }

            await refreshTrip();
            toast({ type: "success", message: `Added "${place.name}" to Day ${dayIndex + 1}` });
        } catch (err) {
            console.error("Failed to add to itinerary:", err);
            toast({ type: "error", message: err instanceof Error ? err.message : "Failed to add to itinerary" });
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
                    {/* Column 1: Left Wishlist Panel */}
                    {isListsCollapsed ? (
                        <div className="w-12 shrink-0 h-full border-r border-accent bg-zinc-50/40 dark:bg-zinc-950/20 backdrop-blur-md flex flex-col items-center py-4 select-none transition-all duration-200">
                            <button
                                type="button"
                                onClick={() => setIsListsCollapsed(false)}
                                className="p-2 text-zinc-400 hover:text-primary dark:hover:text-amber-500 rounded-xl hover:bg-accent transition-all cursor-pointer mb-6"
                                title="Expand Lists"
                            >
                                <PanelLeftOpen size={18} />
                            </button>
                            <div className="flex-1 flex items-center justify-center w-full overflow-hidden">
                                <span 
                                    className="font-display font-bold text-[11px] tracking-widest text-zinc-400 dark:text-zinc-500 whitespace-nowrap uppercase"
                                    style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}
                                >
                                    Lists & Saved Places
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className={`h-full border-r border-accent bg-surface/30 overflow-y-auto custom-scrollbar p-6 transition-all duration-200 ${
                            isItineraryCollapsed ? "flex-1 min-w-0" : "w-[350px] xl:w-[400px] shrink-0"
                        }`}>
                            <SavedPlacesPanel
                                tripId={id}
                                activeListId={activeListId}
                                setActiveListId={setActiveListId}
                                onFocusPlace={focusPlaceOnMap}
                                onCollapse={() => setIsListsCollapsed(true)}
                            />
                        </div>
                    )}

                    {/* Column 2: Center Kanban Whiteboard */}
                    {isItineraryCollapsed ? (
                        <div className="w-12 shrink-0 h-full border-r border-accent bg-zinc-50/30 dark:bg-zinc-950/15 backdrop-blur-md flex flex-col items-center py-4 select-none transition-all duration-200">
                            <button
                                type="button"
                                onClick={() => setIsItineraryCollapsed(false)}
                                className="p-2 text-zinc-400 hover:text-primary dark:hover:text-amber-500 rounded-xl hover:bg-accent transition-all cursor-pointer mb-6"
                                title="Expand Itinerary"
                            >
                                <PanelLeftOpen size={18} />
                            </button>
                            <div className="flex-1 flex items-center justify-center w-full overflow-hidden">
                                <span 
                                    className="font-serif font-bold text-[11px] tracking-widest text-zinc-400 dark:text-zinc-500 whitespace-nowrap uppercase"
                                    style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}
                                >
                                    Trip Itinerary
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 h-full min-w-0 border-r border-accent bg-surface/10 overflow-hidden flex flex-col">
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
                                onCollapse={() => setIsItineraryCollapsed(true)}
                            />
                        </div>
                    )}

                    {/* Column 3: Right Live Map */}
                    {isMapCollapsed && (
                        <div className="hidden lg:flex w-12 shrink-0 h-full border-l border-accent bg-zinc-50/40 dark:bg-zinc-950/20 backdrop-blur-md flex-col items-center py-4 select-none transition-all duration-200">
                            <button
                                type="button"
                                onClick={() => setIsMapCollapsed(false)}
                                className="p-2 text-zinc-400 hover:text-primary dark:hover:text-amber-500 rounded-xl hover:bg-accent transition-all cursor-pointer mb-6"
                                title="Expand Map"
                            >
                                <PanelRightOpen size={18} />
                            </button>
                            <div className="flex-1 flex items-center justify-center w-full overflow-hidden">
                                <span 
                                    className="font-display font-bold text-[11px] tracking-widest text-zinc-400 dark:text-zinc-500 whitespace-nowrap uppercase"
                                    style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}
                                >
                                    Interactive Map
                                </span>
                            </div>
                        </div>
                    )}

                    <div className={`hidden lg:block flex-1 relative bg-gray-100 min-h-0 h-full ${isMapCollapsed ? "lg:!hidden" : ""}`}>
                        <div className="absolute inset-0 w-full h-full border-2 border-transparent">
                            <ErrorBoundary>
                                <TripMap
                                    places={Object.values(trip.places)}
                                    center={mapCenter}
                                    selectedPlaceId={selectedPlace?.id}
                                    onPlaceSelect={focusPlaceOnMap}
                                    isCollapsed={isMapCollapsed}
                                />
                            </ErrorBoundary>
                        </div>

                        {/* Floating Glassmorphic Collapse Map Button */}
                        <div className="absolute top-4 right-4 z-[999]">
                            <button
                                type="button"
                                onClick={() => setIsMapCollapsed(true)}
                                className="p-2 bg-zinc-950/70 backdrop-blur-md border border-white/10 text-white/70 hover:text-white rounded-full shadow-2xl hover:bg-zinc-900/90 hover:scale-[1.05] active:scale-[0.98] transition-all duration-200 cursor-pointer flex items-center justify-center"
                                title="Collapse Map"
                            >
                                <PanelRightClose size={16} />
                            </button>
                        </div>

                        {selectedPlace && (
                            <div className="absolute bottom-6 left-6 right-6 lg:max-w-md lg:mx-auto z-[1000] flex justify-center pointer-events-none">
                                <div className="pointer-events-auto w-full max-w-md">
                                    <PlaceDetailCard
                                        place={selectedPlace}
                                        onClose={() => setSelectedPlace(null)}
                                        onSaveWishlist={handlePlaceSelect}
                                        isSaved={selectedPlace ? Object.values(trip.places).some(p => (p.googlePlaceId && p.googlePlaceId === selectedPlace.googlePlaceId) || p.id === selectedPlace.id) : false}
                                        itineraryDays={trip.itinerary}
                                        onAddToItinerary={handleAddToItinerary}
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
