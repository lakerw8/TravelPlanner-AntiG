"use client";

import { MapPin, Utensils, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Place, PlaceList } from "@/lib/types";
import { formatDateOnly } from "@/lib/date";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { useTripContext } from "@/lib/contexts/TripContext";
import { useToast } from "@/lib/contexts/ToastContext";
import { useConfirm } from "@/components/ui/ConfirmDialog";

interface SavedPlacesPanelProps {
    tripId: string;
    activeListId: string | null;
    setActiveListId: (id: string | null) => void;
    onFocusPlace: (place: Place) => void;
}

export function SavedPlacesPanel({ tripId, activeListId, setActiveListId, onFocusPlace }: SavedPlacesPanelProps) {
    const { trip, lists, refreshTrip } = useTripContext();
    const { toast } = useToast();
    const confirm = useConfirm();

    const [isCreatingList, setIsCreatingList] = useState(false);
    const [newListTitle, setNewListTitle] = useState("");
    const [deletingListId, setDeletingListId] = useState<string | null>(null);
    const [selectedPlaceIds, setSelectedPlaceIds] = useState<Set<string>>(new Set());
    const [bulkTargetDayIndex, setBulkTargetDayIndex] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        setSelectedPlaceIds(new Set());
    }, [activeListId, tripId]);

    useEffect(() => {
        if (!trip) return;
        setBulkTargetDayIndex((curr) => Math.min(curr, Math.max(trip.itinerary.length - 1, 0)));
    }, [trip]);

    if (!trip) return null;

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

    const handleCreateList = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newListTitle.trim()) return;
        try {
            await fetch(`/api/trips/${tripId}/lists`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: newListTitle }),
            });
            setNewListTitle("");
            setIsCreatingList(false);
            toast({ type: "success", message: `List "${newListTitle}" created` });
            await refreshTrip();
        } catch {
            toast({ type: "error", message: "Failed to create list" });
        }
    };

    const handleDeleteList = async (listId: string, listTitle: string) => {
        const ok = await confirm({ title: "Delete list?", message: `Delete "${listTitle}" and all its saved places?`, confirmLabel: "Delete", danger: true });
        if (!ok) return;
        setDeletingListId(listId);
        try {
            await fetch(`/api/trips/${tripId}/lists/${listId}`, { method: "DELETE" });
            if (activeListId === listId) setActiveListId(null);
            toast({ type: "success", message: `Deleted "${listTitle}"` });
            await refreshTrip();
        } catch {
            toast({ type: "error", message: "Failed to delete list" });
        } finally {
            setDeletingListId(null);
        }
    };

    const handleBulkMoveToDay = async (dayIndex: number) => {
        if (selectedPlaceIds.size === 0) return;
        const ok = await confirm({ title: "Move places?", message: `Move ${selectedPlaceIds.size} places to Day ${dayIndex + 1}?` });
        if (!ok) return;
        setIsProcessing(true);
        try {
            const ids = Array.from(selectedPlaceIds);
            await Promise.all(ids.map((placeId) =>
                fetch(`/api/trips/${tripId}/itinerary`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ dayIndex, item: { placeId, startTime: "" } }),
                }),
            ));
            if (activeListId) {
                await Promise.all(ids.map((placeId) =>
                    fetch(`/api/trips/${tripId}/lists/${activeListId}?placeId=${encodeURIComponent(placeId)}`, { method: "DELETE" }),
                ));
            }
            setSelectedPlaceIds(new Set());
            toast({ type: "success", message: `Moved ${ids.length} places to Day ${dayIndex + 1}` });
            await refreshTrip();
        } catch {
            toast({ type: "error", message: "Failed to move places" });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedPlaceIds.size === 0) return;
        const ok = await confirm({ title: "Delete places?", message: `Remove ${selectedPlaceIds.size} places from list?`, confirmLabel: "Delete", danger: true });
        if (!ok) return;
        setIsProcessing(true);
        try {
            const ids = Array.from(selectedPlaceIds);
            const targetLists = activeListId ? lists.filter((l) => l.id === activeListId) : lists;
            const requests: Promise<Response>[] = [];
            targetLists.forEach((list) => {
                ids.forEach((placeId) => {
                    if (!list.placeIds.includes(placeId)) return;
                    requests.push(fetch(`/api/trips/${tripId}/lists/${list.id}?placeId=${encodeURIComponent(placeId)}`, { method: "DELETE" }));
                });
            });
            await Promise.all(requests);
            setSelectedPlaceIds(new Set());
            toast({ type: "success", message: `Removed ${ids.length} places` });
            await refreshTrip();
        } catch {
            toast({ type: "error", message: "Failed to delete places" });
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleSelection = (placeId: string) => {
        setSelectedPlaceIds((prev) => {
            const next = new Set(prev);
            if (next.has(placeId)) next.delete(placeId);
            else next.add(placeId);
            return next;
        });
    };

    return (
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

            {/* List filter tabs */}
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
                        <button onClick={() => setActiveListId(list.id)} className="px-4 py-1.5 text-xs font-bold whitespace-nowrap">
                            {list.title}
                        </button>
                        <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteList(list.id, list.title); }}
                            disabled={deletingListId === list.id}
                            className={`mr-1 h-5 w-5 rounded-full flex items-center justify-center transition-colors ${activeListId === list.id ? "hover:bg-white/20" : "hover:bg-accent"} disabled:opacity-50`}
                            aria-label={`Delete ${list.title}`}
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Bulk actions */}
            {sidebarPlaces.length > 0 && (
                <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="text-xs text-muted">
                        {selectedPlaceIds.size > 0 ? `${selectedPlaceIds.size} selected` : "Bulk actions"}
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setSelectedPlaceIds(new Set(sidebarPlaces.map((p) => p.id)))} className="text-xs px-2.5 py-1 rounded-md border border-accent text-muted hover:text-text hover:border-primary/50">
                            Select All
                        </button>
                        <button type="button" onClick={() => setSelectedPlaceIds(new Set())} className="text-xs px-2.5 py-1 rounded-md border border-accent text-muted hover:text-text hover:border-primary/50">
                            Clear
                        </button>
                    </div>
                </div>
            )}

            {selectedPlaceIds.size > 0 && (
                <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-primary mr-1">{selectedPlaceIds.size} selected</span>
                    <select
                        value={bulkTargetDayIndex}
                        onChange={(e) => setBulkTargetDayIndex(Number(e.target.value))}
                        className="text-xs bg-surface border border-accent rounded-md px-2 py-1 text-text"
                    >
                        {trip.itinerary.map((day, index) => (
                            <option key={day.date} value={index}>{`Day ${index + 1} · ${formatDateOnly(day.date)}`}</option>
                        ))}
                    </select>
                    <button type="button" onClick={() => handleBulkMoveToDay(bulkTargetDayIndex)} disabled={isProcessing} className="text-xs px-3 py-1 rounded-md bg-primary text-white font-bold disabled:opacity-50">
                        Move to Day
                    </button>
                    <button type="button" onClick={handleBulkDelete} disabled={isProcessing} className="text-xs px-3 py-1 rounded-md border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50">
                        Delete Selected
                    </button>
                </div>
            )}

            {/* Draggable place cards */}
            <div className="bg-surface/50 border border-accent/50 rounded-xl p-4 min-h-[120px]">
                <Droppable droppableId="sidebar-list" isDropDisabled direction="horizontal">
                    {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="flex flex-wrap gap-3">
                            {sidebarPlaces.map((place, index) => {
                                const isPlanned = plannedPlaceIds.has(place.id);
                                return (
                                    <Draggable key={place.id} draggableId={place.id} index={index}>
                                        {(draggableProvided, snapshot) => (
                                            <div
                                                ref={draggableProvided.innerRef}
                                                {...draggableProvided.draggableProps}
                                                {...draggableProvided.dragHandleProps}
                                                onClick={() => onFocusPlace(place)}
                                                className={`w-[180px] p-2 rounded-xl border shadow-sm cursor-grab active:cursor-grabbing transition-all relative ${isPlanned ? "bg-surface border-accent hover:border-primary/50" : "bg-amber-50/40 border-amber-300 hover:border-amber-400"} ${snapshot.isDragging ? "ring-2 ring-primary rotate-2 z-50" : ""} ${selectedPlaceIds.has(place.id) ? "ring-2 ring-primary border-primary" : ""}`}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSelection(place.id); }}
                                                    className="absolute top-2 right-2 z-20 h-5 w-5 rounded border bg-surface/90 backdrop-blur-sm text-[11px] leading-none font-bold flex items-center justify-center"
                                                    aria-label={selectedPlaceIds.has(place.id) ? "Unselect place" : "Select place"}
                                                >
                                                    {selectedPlaceIds.has(place.id) ? "✓" : ""}
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
    );
}
