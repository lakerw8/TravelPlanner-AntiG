"use client";

import { MapPin, Utensils, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState, use } from "react";
import { Trip, Place, ItineraryItem, PlaceList } from "@/lib/types";
import { formatDateOnly } from "@/lib/date";
import dynamic from "next/dynamic";
import { EditItemModal } from "@/components/trip/EditItemModal";
import { EditLodgingModal } from "@/components/trip/EditLodgingModal";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { PlaceAutocomplete } from "@/components/trip/PlaceAutocomplete";
import { PlaceCard } from "@/components/trip/PlaceCard";
import { PlaceDetailCard } from "@/components/trip/PlaceDetailCard";

const TripMap = dynamic(() => import("@/components/trip/TripMap"), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-surface flex items-center justify-center text-muted">Loading Map...</div>,
});

function isEditableItem(item: ItineraryItem): boolean {
    return !item.itemType || item.itemType === "itinerary";
}

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
    const [trip, setTrip] = useState<Trip | null>(null);
    const [editingItem, setEditingItem] = useState<{ dayIndex: number; item: ItineraryItem; place: Place } | null>(null);
    const [editingLodging, setEditingLodging] = useState<{ place: Place; checkIn?: string; checkOut?: string } | null>(null);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [mapCenter, setMapCenter] = useState<[number, number] | undefined>(undefined);
    const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
    const [lists, setLists] = useState<PlaceList[]>([]);
    const [activeListId, setActiveListId] = useState<string | null>(null);
    const [isCreatingList, setIsCreatingList] = useState(false);
    const [newListTitle, setNewListTitle] = useState("");
    const [deletingListId, setDeletingListId] = useState<string | null>(null);
    const [selectedSavedPlaceIds, setSelectedSavedPlaceIds] = useState<Set<string>>(new Set());
    const [bulkSavedPlacesTargetDayIndex, setBulkSavedPlacesTargetDayIndex] = useState(0);
    const [isProcessingSavedPlaces, setIsProcessingSavedPlaces] = useState(false);

    const fetchTrip = useCallback(() => {
        fetch(`/api/trips/${id}`)
            .then((res) => {
                if (!res.ok) throw new Error("Failed to fetch trip");
                return res.json();
            })
            .then((tripData: Trip) => {
                setTrip(tripData);
                setLists(tripData.lists || []);
                if (tripData.lat && tripData.lng) {
                    setMapCenter((current) => current ?? [tripData.lat!, tripData.lng!]);
                }
            })
            .catch((err) => console.error(err));
    }, [id]);

    useEffect(() => {
        fetchTrip();
    }, [fetchTrip]);

    useEffect(() => {
        setSelectedSavedPlaceIds(new Set());
    }, [activeListId, id]);

    useEffect(() => {
        if (!trip) return;
        setBulkSavedPlacesTargetDayIndex((currentIndex) => {
            const maxIndex = Math.max(trip.itinerary.length - 1, 0);
            return Math.min(currentIndex, maxIndex);
        });
    }, [trip]);

    useEffect(() => {
        const handleScrollRequest = (event: Event) => {
            const customEvent = event as CustomEvent<{ sectionId?: string }>;
            const sectionId = customEvent.detail?.sectionId;
            if (!sectionId) return;

            const targetElement = document.getElementById(sectionId);
            if (!targetElement) return;

            targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
        };

        window.addEventListener("trip:scroll-to-section", handleScrollRequest as EventListener);
        return () => {
            window.removeEventListener("trip:scroll-to-section", handleScrollRequest as EventListener);
        };
    }, []);

    const handleCreateList = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newListTitle.trim()) return;

        try {
            await fetch(`/api/trips/${id}/lists`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: newListTitle }),
            });
            setNewListTitle("");
            setIsCreatingList(false);
            fetchTrip();
        } catch (error) {
            console.error("Failed to create list", error);
        }
    };

    const handleDeleteList = async (listId: string, listTitle: string) => {
        if (!confirm(`Delete list "${listTitle}"?`)) return;

        setDeletingListId(listId);
        try {
            await fetch(`/api/trips/${id}/lists/${listId}`, {
                method: "DELETE",
            });
            if (activeListId === listId) {
                setActiveListId(null);
            }
            fetchTrip();
        } catch (error) {
            console.error("Failed to delete list", error);
        } finally {
            setDeletingListId(null);
        }
    };

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
                address: place.address ?? result.formatted_address ?? place.address,
                rating: place.rating ?? result.rating ?? place.rating,
                userRatingsTotal: place.userRatingsTotal ?? result.user_ratings_total ?? place.userRatingsTotal,
                image: place.image || fallbackPhoto || place.image,
                priceLevel: place.priceLevel ?? result.price_level ?? place.priceLevel,
                website: place.website ?? result.website ?? place.website,
                lat: place.lat ?? result.geometry?.location?.lat ?? place.lat,
                lng: place.lng ?? result.geometry?.location?.lng ?? place.lng,
                openingHours,
                editorialSummary: place.editorialSummary ?? result.editorial_summary?.overview ?? place.editorialSummary,
                formattedPhoneNumber: place.formattedPhoneNumber ?? result.formatted_phone_number ?? result.international_phone_number ?? place.formattedPhoneNumber,
            };

            setSelectedPlace((current) => {
                if (!current || current.id !== place.id) return current;
                return hydratedPlace;
            });

            setTrip((currentTrip) => {
                if (!currentTrip) return currentTrip;
                const currentPlace = currentTrip.places[place.id];
                if (!currentPlace) return currentTrip;

                return {
                    ...currentTrip,
                    places: {
                        ...currentTrip.places,
                        [place.id]: {
                            ...currentPlace,
                            ...hydratedPlace,
                        },
                    },
                };
            });
        } catch (error) {
            console.error("Failed to hydrate place details", error);
        }
    }, []);

    const handlePlaceSelect = async (place: Place) => {
        if (place.type === "lodging") {
            alert("Use the Lodging menu to add hotels so dates and edits are managed there.");
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

            if (canonicalPlace.lat && canonicalPlace.lng) {
                setMapCenter([canonicalPlace.lat, canonicalPlace.lng]);
            }
            setSelectedPlace(canonicalPlace);
            if ((!canonicalPlace.openingHours || canonicalPlace.openingHours.length === 0) && canonicalPlace.googlePlaceId) {
                void hydratePlaceDetailsFromGoogle(canonicalPlace);
            }
            fetchTrip();
        } catch (error) {
            console.error("Failed to add place", error);
        }
    };

    const focusPlaceOnMap = (place: Place) => {
        setSelectedPlace(place);
        if (place.lat && place.lng) {
            setMapCenter([place.lat, place.lng]);
        }

        if ((!place.openingHours || place.openingHours.length === 0) && place.googlePlaceId) {
            void hydratePlaceDetailsFromGoogle(place);
        }
    };

    const handleRemoveItem = async (dayIndex: number, item: ItineraryItem) => {
        if (!confirm("Remove this item from your itinerary?")) return;

        if (item.itemType === "flight" && item.sourceId) {
            await fetch(`/api/trips/${id}/flights/${item.sourceId}`, { method: "DELETE" });
            fetchTrip();
            return;
        }

        if (item.itemType === "lodging" && item.sourceId) {
            await fetch(`/api/trips/${id}/lodging/${item.sourceId}`, { method: "DELETE" });
            fetchTrip();
            return;
        }

        await fetch(`/api/trips/${id}/itinerary?day=${dayIndex}&itemId=${item.id}`, {
            method: "DELETE",
        });
        fetchTrip();
    };

    const onDragEnd = async (result: DropResult) => {
        const { source, destination, draggableId } = result;

        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;
        if (!trip) return;

        if (source.droppableId === "sidebar-list" && destination.droppableId.startsWith("day-")) {
            const destDayIndex = Number.parseInt(destination.droppableId.replace("day-", ""), 10);
            await fetch(`/api/trips/${id}/itinerary`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    dayIndex: destDayIndex,
                    item: {
                        placeId: draggableId,
                        startTime: "",
                    },
                }),
            });
            fetchTrip();
            return;
        }

        if (source.droppableId.startsWith("day-") && destination.droppableId.startsWith("day-")) {
            const sourceDayIndex = Number.parseInt(source.droppableId.replace("day-", ""), 10);
            const destDayIndex = Number.parseInt(destination.droppableId.replace("day-", ""), 10);

            try {
                await fetch(`/api/trips/${id}/itinerary/reorder`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        itemId: draggableId,
                        sourceDayIndex,
                        sourceIndex: source.index,
                        destDayIndex,
                        destIndex: destination.index,
                    }),
                });
            } catch (error) {
                console.error("Failed to reorder", error);
            }
            fetchTrip();
        }

        setSelectedItems(new Set());
    };

    const toggleSelection = (itemId: string) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(itemId)) {
            newSelected.delete(itemId);
        } else {
            newSelected.add(itemId);
        }
        setSelectedItems(newSelected);
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Delete ${selectedItems.size} items?`)) return;
        if (!trip) return;

        const deletionPromises: Promise<Response>[] = [];
        trip.itinerary.forEach((day, dayIndex) => {
            day.items.forEach((item) => {
                if (selectedItems.has(item.id) && isEditableItem(item)) {
                    deletionPromises.push(fetch(`/api/trips/${id}/itinerary?day=${dayIndex}&itemId=${item.id}`, { method: "DELETE" }));
                }
            });
        });

        await Promise.all(deletionPromises);
        setSelectedItems(new Set());
        fetchTrip();
    };

    const toggleSavedPlaceSelection = (placeId: string) => {
        setSelectedSavedPlaceIds((currentSelection) => {
            const nextSelection = new Set(currentSelection);
            if (nextSelection.has(placeId)) {
                nextSelection.delete(placeId);
            } else {
                nextSelection.add(placeId);
            }
            return nextSelection;
        });
    };

    const selectAllVisibleSavedPlaces = (visiblePlaces: Place[]) => {
        setSelectedSavedPlaceIds(new Set(visiblePlaces.map((place) => place.id)));
    };

    const clearSavedPlaceSelection = () => {
        setSelectedSavedPlaceIds(new Set());
    };

    const handleBulkMoveSavedPlacesToDay = async (dayIndex: number) => {
        if (!trip || selectedSavedPlaceIds.size === 0) return;
        if (!confirm(`Move ${selectedSavedPlaceIds.size} places to Day ${dayIndex + 1}?`)) return;

        setIsProcessingSavedPlaces(true);
        try {
            const selectedPlaceIds = Array.from(selectedSavedPlaceIds);
            await Promise.all(
                selectedPlaceIds.map((placeId) =>
                    fetch(`/api/trips/${id}/itinerary`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            dayIndex,
                            item: {
                                placeId,
                                startTime: "",
                            },
                        }),
                    }),
                ),
            );

            if (activeListId) {
                await Promise.all(
                    selectedPlaceIds.map((placeId) =>
                        fetch(`/api/trips/${id}/lists/${activeListId}?placeId=${encodeURIComponent(placeId)}`, {
                            method: "DELETE",
                        }),
                    ),
                );
            }

            setSelectedSavedPlaceIds(new Set());
            fetchTrip();
        } catch (error) {
            console.error("Failed to move selected saved places", error);
        } finally {
            setIsProcessingSavedPlaces(false);
        }
    };

    const handleBulkDeleteSavedPlaces = async () => {
        if (!trip || selectedSavedPlaceIds.size === 0) return;
        if (!confirm(`Delete ${selectedSavedPlaceIds.size} selected saved places from list(s)?`)) return;

        setIsProcessingSavedPlaces(true);
        try {
            const selectedPlaceIds = Array.from(selectedSavedPlaceIds);
            const targetLists = activeListId
                ? lists.filter((list) => list.id === activeListId)
                : lists;

            const deletionRequests: Promise<Response>[] = [];
            targetLists.forEach((list) => {
                selectedPlaceIds.forEach((placeId) => {
                    if (!list.placeIds.includes(placeId)) return;
                    deletionRequests.push(
                        fetch(`/api/trips/${id}/lists/${list.id}?placeId=${encodeURIComponent(placeId)}`, {
                            method: "DELETE",
                        }),
                    );
                });
            });

            await Promise.all(deletionRequests);
            setSelectedSavedPlaceIds(new Set());
            fetchTrip();
        } catch (error) {
            console.error("Failed to delete selected saved places", error);
        } finally {
            setIsProcessingSavedPlaces(false);
        }
    };

    if (!trip) return <div className="p-12 text-center text-muted">Loading Trip...</div>;

    const plannedPlaceIds = new Set<string>();
    for (const day of trip.itinerary) {
        for (const item of day.items) {
            if (item.itemType && item.itemType !== "itinerary") continue;
            plannedPlaceIds.add(item.placeId);
        }
    }

    const sidebarPlaces = activeListId
        ? (lists.find((list) => list.id === activeListId)?.placeIds
            .map((placeId) => trip.places[placeId])
            .filter((place): place is Place => !!place && place.type !== "flight" && place.type !== "lodging")
            ?? [])
        : Object.values(trip.places).filter((place) => place.type !== "flight" && place.type !== "lodging");

    return (
        <div className="flex flex-col flex-1 w-full h-full bg-background overflow-hidden relative">
            <header className="px-6 py-4 bg-surface border-b border-accent flex items-center gap-6 shrink-0 z-40 shadow-sm relative">
                <div className="flex-1 max-w-2xl mx-auto">
                    <PlaceAutocomplete
                        onSelect={handlePlaceSelect}
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

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex-1 overflow-hidden flex flex-row relative min-h-0 w-full">
                    <div className="w-full lg:w-[500px] xl:w-[600px] h-full overflow-y-auto border-r border-accent bg-surface/30 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] z-10 custom-scrollbar relative scroll-smooth">
                        <div className="p-6 pb-32 space-y-8">
                            <div id="lists-section" className="scroll-mt-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="font-display font-bold text-xl flex items-center gap-2">
                                        <Utensils size={20} className="text-primary" />
                                        Lists & Saved Places
                                    </h2>
                                    {!isCreatingList ? (
                                        <button onClick={() => setIsCreatingList(true)} className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/20 font-medium">
                                            + New List
                                        </button>
                                    ) : (
                                        <form onSubmit={handleCreateList} className="flex gap-2">
                                            <input
                                                autoFocus
                                                type="text"
                                                value={newListTitle}
                                                onChange={(e) => setNewListTitle(e.target.value)}
                                                placeholder="List Name"
                                                className="text-xs border border-primary rounded px-2 py-1 outline-none w-32"
                                                onBlur={() => !newListTitle && setIsCreatingList(false)}
                                            />
                                            <button type="submit" className="text-xs bg-primary text-white px-2 py-1 rounded font-bold">Add</button>
                                            <button type="button" onClick={() => setIsCreatingList(false)} className="text-xs text-muted px-1"><X size={14} /></button>
                                        </form>
                                    )}
                                </div>

                                <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
                                    <button
                                        onClick={() => setActiveListId(null)}
                                        className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${!activeListId ? "bg-primary text-white border-primary" : "bg-surface text-muted border-accent hover:border-primary/50"}`}
                                    >
                                        All Places
                                    </button>
                                    {lists.map((list) => (
                                        <div
                                            key={list.id}
                                            className={`inline-flex items-center rounded-full border transition-colors ${activeListId === list.id ? "bg-primary text-white border-primary" : "bg-surface text-muted border-accent hover:border-primary/50"}`}
                                        >
                                            <button
                                                onClick={() => setActiveListId(list.id)}
                                                className="px-4 py-1.5 text-xs font-bold whitespace-nowrap"
                                            >
                                                {list.title}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.preventDefault();
                                                    event.stopPropagation();
                                                    handleDeleteList(list.id, list.title);
                                                }}
                                                disabled={deletingListId === list.id}
                                                className={`mr-1 h-5 w-5 rounded-full flex items-center justify-center transition-colors ${activeListId === list.id ? "hover:bg-white/20" : "hover:bg-accent"} disabled:opacity-50`}
                                                aria-label={`Delete ${list.title}`}
                                                title={`Delete ${list.title}`}
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {sidebarPlaces.length > 0 && (
                                    <div className="mb-3 flex items-center justify-between gap-2">
                                        <div className="text-xs text-muted">
                                            {selectedSavedPlaceIds.size > 0 ? `${selectedSavedPlaceIds.size} selected` : "Bulk actions"}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => selectAllVisibleSavedPlaces(sidebarPlaces)}
                                                className="text-xs px-2.5 py-1 rounded-md border border-accent text-muted hover:text-text hover:border-primary/50"
                                            >
                                                Select All
                                            </button>
                                            <button
                                                type="button"
                                                onClick={clearSavedPlaceSelection}
                                                className="text-xs px-2.5 py-1 rounded-md border border-accent text-muted hover:text-text hover:border-primary/50"
                                            >
                                                Clear
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {selectedSavedPlaceIds.size > 0 && (
                                    <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg flex flex-wrap items-center gap-2">
                                        <span className="text-xs font-bold text-primary mr-1">{selectedSavedPlaceIds.size} selected</span>
                                        <select
                                            value={bulkSavedPlacesTargetDayIndex}
                                            onChange={(event) => setBulkSavedPlacesTargetDayIndex(Number(event.target.value))}
                                            className="text-xs bg-surface border border-accent rounded-md px-2 py-1 text-text"
                                        >
                                            {trip.itinerary.map((day, index) => (
                                                <option key={day.date} value={index}>
                                                    {`Day ${index + 1} · ${formatDateOnly(day.date)}`}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => handleBulkMoveSavedPlacesToDay(bulkSavedPlacesTargetDayIndex)}
                                            disabled={isProcessingSavedPlaces}
                                            className="text-xs px-3 py-1 rounded-md bg-primary text-white font-bold disabled:opacity-50"
                                        >
                                            Move to Day
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleBulkDeleteSavedPlaces}
                                            disabled={isProcessingSavedPlaces}
                                            className="text-xs px-3 py-1 rounded-md border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
                                        >
                                            Delete Selected
                                        </button>
                                    </div>
                                )}

                                <div className="bg-surface/50 border border-accent/50 rounded-xl p-4 min-h-[120px]">
                                    <Droppable droppableId="sidebar-list" isDropDisabled direction="horizontal">
                                        {(provided) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.droppableProps}
                                                className="flex flex-wrap gap-3"
                                            >
                                                {sidebarPlaces.map((place, index) => {
                                                    const isPlanned = plannedPlaceIds.has(place.id);
                                                    return (
                                                        <Draggable key={place.id} draggableId={place.id} index={index}>
                                                            {(draggableProvided, snapshot) => (
                                                                <div
                                                                    ref={draggableProvided.innerRef}
                                                                    {...draggableProvided.draggableProps}
                                                                    {...draggableProvided.dragHandleProps}
                                                                    onClick={() => {
                                                                        focusPlaceOnMap(place);
                                                                    }}
                                                                    className={`w-[180px] p-2 rounded-xl border shadow-sm cursor-grab active:cursor-grabbing transition-all relative ${isPlanned ? "bg-surface border-accent hover:border-primary/50" : "bg-amber-50/40 border-amber-300 hover:border-amber-400"} ${snapshot.isDragging ? "ring-2 ring-primary rotate-2 z-50" : ""} ${selectedSavedPlaceIds.has(place.id) ? "ring-2 ring-primary border-primary" : ""}`}
                                                                >
                                                                    <button
                                                                        type="button"
                                                                        onClick={(event) => {
                                                                            event.preventDefault();
                                                                            event.stopPropagation();
                                                                            toggleSavedPlaceSelection(place.id);
                                                                        }}
                                                                        className="absolute top-2 right-2 z-20 h-5 w-5 rounded border bg-surface/90 backdrop-blur-sm text-[11px] leading-none font-bold flex items-center justify-center"
                                                                        aria-label={selectedSavedPlaceIds.has(place.id) ? "Unselect place" : "Select place"}
                                                                    >
                                                                        {selectedSavedPlaceIds.has(place.id) ? "✓" : ""}
                                                                    </button>
                                                                    <div className="aspect-video w-full bg-gray-100 rounded-lg overflow-hidden mb-2 relative">
                                                                        {place.image ? (
                                                                            <img src={place.image} alt={place.name} className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <div className="flex items-center justify-center h-full text-muted"><MapPin size={16} /></div>
                                                                        )}
                                                                    </div>
                                                                    <h4 className="font-bold text-xs text-text truncate">{place.name}</h4>
                                                                    <p className="text-[10px] text-muted capitalize truncate">{place.type}</p>
                                                                    {!isPlanned && (
                                                                        <span className="inline-flex mt-1 text-[9px] uppercase tracking-wider font-bold text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-1.5 py-0.5">
                                                                            Unplanned
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </Draggable>
                                                    );
                                                })}
                                                {provided.placeholder}
                                                {sidebarPlaces.length === 0 && (
                                                    <div className="w-full text-center text-muted text-sm py-4 italic">
                                                        No places in this list.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </Droppable>
                                </div>
                            </div>

                            <hr className="border-accent" />

                            <div>
                                {selectedItems.size > 0 && (
                                    <div className="mb-6 p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between sticky top-0 z-20 backdrop-blur-md shadow-sm">
                                        <span className="font-bold text-primary text-sm">{selectedItems.size} items selected</span>
                                        <button onClick={handleBulkDelete} className="text-red-500 hover:text-red-700 text-sm font-bold flex items-center gap-1">
                                            <Trash2 size={16} /> Delete Selected
                                        </button>
                                    </div>
                                )}

                                {trip.itinerary.map((day, dayIndex) => {
                                    const virtualItems = day.items.filter((item) => !isEditableItem(item));
                                    const itineraryItems = day.items.filter((item) => isEditableItem(item));

                                    return (
                                        <section key={day.date} className="mb-12 scroll-mt-6 transition-colors" id={`day-${dayIndex}`}>
                                            <div className="flex items-baseline justify-between mb-6 sticky top-0 bg-surface/95 backdrop-blur py-2 z-10 border-b border-accent/50">
                                                <h3 className={`font-display text-2xl font-bold text-text pl-2 border-l-4 ${["border-primary", "border-emerald-500", "border-rose-500", "border-orange-500", "border-sky-500", "border-indigo-500"][dayIndex % 6]}`}>
                                                    {formatDateOnly(day.date, "en-US", { weekday: "long", month: "long", day: "numeric" })}
                                                </h3>
                                            </div>

                                            <div className="space-y-4 mb-4">
                                                {virtualItems.map((item, itemIndex) => {
                                                    const place = trip.places[item.placeId];
                                                    if (!place) return null;

                                                    return (
                                                        <PlaceCard
                                                            key={item.id}
                                                            place={place}
                                                            previousPlace={itemIndex > 0 ? trip.places[virtualItems[itemIndex - 1].placeId] : undefined}
                                                            item={item}
                                                            isSelected={false}
                                                            isDragging={false}
                                                            onToggleSelection={() => undefined}
                                                            onEdit={() => {
                                                                if (place.type === "lodging") {
                                                                    setEditingLodging({
                                                                        place,
                                                                        checkIn: place.checkIn,
                                                                        checkOut: place.checkOut,
                                                                    });
                                                                }
                                                            }}
                                                            onRemove={() => handleRemoveItem(dayIndex, item)}
                                                            onCardClick={() => focusPlaceOnMap(place)}
                                                        />
                                                    );
                                                })}
                                            </div>

                                            <Droppable droppableId={`day-${dayIndex}`}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.droppableProps}
                                                        className={`space-y-4 min-h-[100px] transition-colors ${snapshot.isDraggingOver ? "bg-primary/5 rounded-xl -mx-2 px-2" : ""}`}
                                                    >
                                                        {itineraryItems.map((item, itemIndex) => {
                                                            const place = trip.places[item.placeId];
                                                            if (!place) return null;

                                                            const isSelected = selectedItems.has(item.id);
                                                            const previousItineraryPlace = itemIndex > 0
                                                                ? trip.places[itineraryItems[itemIndex - 1].placeId]
                                                                : undefined;

                                                            return (
                                                                <Draggable key={item.id} draggableId={item.id} index={itemIndex}>
                                                                    {(draggableProvided, snapshot) => (
                                                                        <div
                                                                            ref={draggableProvided.innerRef}
                                                                            {...draggableProvided.draggableProps}
                                                                            {...draggableProvided.dragHandleProps}
                                                                        >
                                                                            <PlaceCard
                                                                                place={place}
                                                                                previousPlace={previousItineraryPlace}
                                                                                item={item}
                                                                                isSelected={isSelected}
                                                                                isDragging={snapshot.isDragging}
                                                                                onToggleSelection={() => toggleSelection(item.id)}
                                                                                onEdit={() => setEditingItem({ dayIndex, item, place })}
                                                                                onRemove={() => handleRemoveItem(dayIndex, item)}
                                                                                onCardClick={() => focusPlaceOnMap(place)}
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </Draggable>
                                                            );
                                                        })}
                                                        {provided.placeholder}
                                                        {itineraryItems.length === 0 && (
                                                            <div className="h-24 border-2 border-dashed border-accent rounded-xl flex items-center justify-center text-muted text-sm hover:border-primary/50 transition-colors bg-surface/50">
                                                                Drag places here to plan this day
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </Droppable>
                                        </section>
                                    );
                                })}
                            </div>
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
                        if (refresh) fetchTrip();
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
                        if (refresh) fetchTrip();
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
