"use client";

import { MapPin, Utensils, X, List, Grid, PanelLeftClose, Trash2 } from "lucide-react";
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
    onCollapse?: () => void;
}

export function SavedPlacesPanel({ tripId, activeListId, setActiveListId, onFocusPlace, onCollapse }: SavedPlacesPanelProps) {
    const { trip, lists, refreshTrip } = useTripContext();
    const { toast } = useToast();
    const confirm = useConfirm();

    const [isCreatingList, setIsCreatingList] = useState(false);
    const [newListTitle, setNewListTitle] = useState("");
    const [deletingListId, setDeletingListId] = useState<string | null>(null);
    const [selectedPlaceIds, setSelectedPlaceIds] = useState<Set<string>>(new Set());
    const [bulkTargetDayIndex, setBulkTargetDayIndex] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeCategory, setActiveCategory] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<"all" | "planned" | "unplanned">("all");
    const [viewMode, setViewMode] = useState<"compact" | "grid">("compact");

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

    const sidebarPlaces = (() => {
        if (activeListId) {
            return (lists.find((list) => list.id === activeListId)?.placeIds
                .map((placeId) => trip.places[placeId])
                .filter((place): place is Place => !!place && place.type !== "flight" && place.type !== "lodging")
                ?? []);
        } else {
            // Collect place IDs from all lists to represent "All Saved Places"
            const savedPlaceIds = new Set<string>();
            lists.forEach((list) => {
                list.placeIds.forEach((id) => savedPlaceIds.add(id));
            });
            return Array.from(savedPlaceIds)
                .map((placeId) => trip.places[placeId])
                .filter((place): place is Place => !!place && place.type !== "flight" && place.type !== "lodging");
        }
    })();

    const filteredPlaces = sidebarPlaces.filter((place) => {
        if (activeCategory === "all") return true;
        const name = place.name.toLowerCase();
        const type = (place.type || "").toLowerCase();
        const addr = (place.address || "").toLowerCase();

        if (activeCategory === "dining") {
            return type === "restaurant" || type.includes("food") || type.includes("dining") || 
                   name.includes("food") || name.includes("restaurant") || name.includes("dining") || name.includes("sushi") || name.includes("bar") || name.includes("kitchen") || name.includes("ramen") || name.includes("eatery");
        }
        if (activeCategory === "sightseeing") {
            return type === "activity" || type.includes("park") || type.includes("museum") || type.includes("attraction") ||
                   name.includes("park") || name.includes("museum") || name.includes("temple") || name.includes("shrine") || name.includes("sight") || name.includes("view") || name.includes("tower") || name.includes("garden") || name.includes("art") || name.includes("palace") || name.includes("castle") || name.includes("bridge");
        }
        if (activeCategory === "cafe") {
            return name.includes("cafe") || name.includes("coffee") || name.includes("tea") || name.includes("bakery") || name.includes("dessert") || name.includes("roaster");
        }
        if (activeCategory === "shopping") {
            return type === "shopping" || type.includes("store") || type.includes("mall") || type.includes("shop") || type.includes("boutique") || type.includes("market") || type.includes("retail") ||
                   name.includes("shop") || name.includes("store") || name.includes("mall") || name.includes("market") || name.includes("plaza") || name.includes("center") || name.includes("loft") || name.includes("gift") || name.includes("souvenir") || name.includes("outlet") || name.includes("fashion") || name.includes("department") || name.includes("boutique");
        }
        return true;
    });

    const statusFilteredPlaces = filteredPlaces.filter((place) => {
        const isPlanned = plannedPlaceIds.has(place.id);
        if (statusFilter === "planned") return isPlanned;
        if (statusFilter === "unplanned") return !isPlanned;
        return true;
    });

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

    const handleDeletePlaceSingle = async (placeId: string, placeName: string) => {
        const targetListTitle = activeListId 
            ? (lists.find(l => l.id === activeListId)?.title || "list")
            : "wishlist";
            
        const ok = await confirm({ 
            title: "Delete place?", 
            message: `Remove "${placeName}" from your ${targetListTitle}?`, 
            confirmLabel: "Delete", 
            danger: true 
        });
        if (!ok) return;
        
        setIsProcessing(true);
        try {
            const targetLists = activeListId ? lists.filter((l) => l.id === activeListId) : lists;
            const requests: Promise<Response>[] = [];
            targetLists.forEach((list) => {
                if (list.placeIds.includes(placeId)) {
                    requests.push(fetch(`/api/trips/${tripId}/lists/${list.id}?placeId=${encodeURIComponent(placeId)}`, { method: "DELETE" }));
                }
            });
            
            // If activeListId is null (representing All Places), also check the default Saved Places list
            if (!activeListId) {
                const defaultList = lists.find(l => l.title === "Saved Places");
                if (defaultList && defaultList.placeIds.includes(placeId)) {
                    // It will already be covered in targetLists if defaultList exists,
                    // but let's make sure it is sent
                }
            }
            
            await Promise.all(requests);
            
            // Clear selection if it was selected
            setSelectedPlaceIds((prev) => {
                const next = new Set(prev);
                next.delete(placeId);
                return next;
            });
            
            toast({ type: "success", message: `Removed "${placeName}"` });
            await refreshTrip();
        } catch {
            toast({ type: "error", message: "Failed to remove place" });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div id="lists-section" className="scroll-mt-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-xl flex items-center gap-2">
                    <Utensils size={20} className="text-primary" />
                    Lists & Saved Places
                </h2>
                <div className="flex items-center gap-2">
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
                    {onCollapse && (
                        <button
                            onClick={onCollapse}
                            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-accent transition-colors shrink-0 cursor-pointer"
                            title="Collapse Lists"
                        >
                            <PanelLeftClose size={16} />
                        </button>
                    )}
                </div>
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

            {/* Category quick filters */}
            <div className="flex gap-1.5 mb-4 overflow-x-auto no-scrollbar pb-1">
                {[
                    { id: "all", label: "All", icon: "🌍" },
                    { id: "dining", label: "Dining", icon: "🍔" },
                    { id: "sightseeing", label: "Sightseeing", icon: "🗼" },
                    { id: "cafe", label: "Cafe", icon: "☕" },
                    { id: "shopping", label: "Shopping", icon: "🛍️" },
                ].map((cat) => (
                    <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all duration-150 flex items-center gap-1 cursor-pointer ${activeCategory === cat.id ? "bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/30 shadow-sm" : "bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"}`}
                    >
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                    </button>
                ))}
            </div>

            {/* Status and Layout Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                {/* Status Segments */}
                <div className="flex p-0.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50">
                    {[
                        { id: "all", label: "All" },
                        { id: "planned", label: "Planned" },
                        { id: "unplanned", label: "Unplanned" },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setStatusFilter(tab.id as any)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-150 whitespace-nowrap cursor-pointer ${statusFilter === tab.id ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm border border-zinc-200/40 dark:border-zinc-650" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Layout View Mode Toggle */}
                <div className="flex p-0.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50 items-center">
                    <button
                        type="button"
                        onClick={() => setViewMode("compact")}
                        className={`p-1.5 rounded-lg transition-all duration-150 cursor-pointer ${viewMode === "compact" ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm border border-zinc-200/40 dark:border-zinc-650" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"}`}
                        title="Compact List View"
                    >
                        <List size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode("grid")}
                        className={`p-1.5 rounded-lg transition-all duration-150 cursor-pointer ${viewMode === "grid" ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm border border-zinc-200/40 dark:border-zinc-650" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"}`}
                        title="Classic Grid View"
                    >
                        <Grid size={14} />
                    </button>
                </div>
            </div>

            {/* Bulk actions */}
            {statusFilteredPlaces.length > 0 && (
                <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="text-xs text-muted">
                        {selectedPlaceIds.size > 0 ? `${selectedPlaceIds.size} selected` : "Bulk actions"}
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setSelectedPlaceIds(new Set(statusFilteredPlaces.map((p) => p.id)))} className="text-xs px-2.5 py-1 rounded-md border border-accent text-muted hover:text-text hover:border-primary/50 cursor-pointer">
                            Select All
                        </button>
                        <button type="button" onClick={() => setSelectedPlaceIds(new Set())} className="text-xs px-2.5 py-1 rounded-md border border-accent text-muted hover:text-text hover:border-primary/50 cursor-pointer">
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
                    <button type="button" onClick={() => handleBulkMoveToDay(bulkTargetDayIndex)} disabled={isProcessing} className="text-xs px-3 py-1 rounded-md bg-primary text-white font-bold disabled:opacity-50 cursor-pointer">
                        Move to Day
                    </button>
                    <button type="button" onClick={handleBulkDelete} disabled={isProcessing} className="text-xs px-3 py-1 rounded-md border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 cursor-pointer">
                        Delete Selected
                    </button>
                </div>
            )}

            {/* Draggable place cards */}
            <div className="bg-surface/50 border border-accent/50 rounded-xl p-4 min-h-[120px] @container">
                <Droppable droppableId="sidebar-list" isDropDisabled direction={viewMode === "compact" ? "vertical" : "horizontal"}>
                    {(provided) => (
                        <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={viewMode === "compact" ? "flex flex-col gap-2 w-full" : "grid grid-cols-2 @md:grid-cols-3 @lg:grid-cols-4 @2xl:grid-cols-5 @4xl:grid-cols-6 gap-3 w-full"}
                        >
                            {statusFilteredPlaces.map((place, index) => {
                                const isPlanned = plannedPlaceIds.has(place.id);
                                return (
                                    <Draggable key={place.id} draggableId={place.id} index={index}>
                                        {(draggableProvided, snapshot) => {
                                            if (viewMode === "compact") {
                                                return (
                                                    <div
                                                        ref={draggableProvided.innerRef}
                                                        {...draggableProvided.draggableProps}
                                                        {...draggableProvided.dragHandleProps}
                                                        onClick={() => onFocusPlace(place)}
                                                        className={`w-full flex items-center justify-between p-2 rounded-xl border shadow-sm cursor-grab active:cursor-grabbing transition-all ${isPlanned ? "bg-surface border-accent hover:border-primary/50" : "bg-amber-500/[0.04] border-amber-300/60 dark:border-amber-500/20 hover:border-amber-400"} ${snapshot.isDragging ? "ring-2 ring-primary rotate-2 z-50 animate-pulse bg-surface/90" : ""} ${selectedPlaceIds.has(place.id) ? "ring-2 ring-primary border-primary" : ""}`}
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                            {/* Selection Checkbox */}
                                                            <button
                                                                type="button"
                                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSelection(place.id); }}
                                                                className={`h-4 w-4 rounded border text-[10px] leading-none font-bold flex items-center justify-center cursor-pointer transition-colors ${selectedPlaceIds.has(place.id) ? "bg-primary text-white border-primary" : "bg-surface/90 border-accent text-transparent hover:border-primary"}`}
                                                                aria-label={selectedPlaceIds.has(place.id) ? "Unselect place" : "Select place"}
                                                             >
                                                                {selectedPlaceIds.has(place.id) ? "✓" : ""}
                                                            </button>

                                                            {/* Micro category icon / emoji */}
                                                            <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs">
                                                                {place.type === "restaurant" || (place.type || "").includes("food") ? "🍔" :
                                                                 (place.type || "").includes("cafe") || place.name.toLowerCase().includes("cafe") || place.name.toLowerCase().includes("coffee") ? "☕" :
                                                                 (place.type || "").includes("shopping") || (place.type || "").includes("store") || (place.type || "").includes("mall") || (place.type || "").includes("shop") || place.name.toLowerCase().includes("shop") || place.name.toLowerCase().includes("store") || place.name.toLowerCase().includes("mall") || place.name.toLowerCase().includes("market") || place.name.toLowerCase().includes("loft") ? "🛍️" :
                                                                 "🗼"}
                                                            </div>

                                                            {/* Place Text Details */}
                                                            <div className="min-w-0 flex-1">
                                                                <h4 className="font-bold text-xs text-text truncate leading-tight">{place.name}</h4>
                                                                <p className="text-[10px] text-muted capitalize truncate mt-0.5 flex items-center gap-1.5">
                                                                    <span>{place.type || "place"}</span>
                                                                    {place.rating && (
                                                                        <span className="text-amber-500 font-extrabold flex items-center gap-0.5">
                                                                            ★ {place.rating}
                                                                        </span>
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Status Badge & Actions */}
                                                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                                            {isPlanned ? (
                                                                <span className="inline-flex text-[9px] uppercase tracking-wider font-extrabold text-teal-700 dark:text-teal-400 bg-teal-500/10 border border-teal-500/20 rounded-full px-2 py-0.5">
                                                                    Planned
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex text-[9px] uppercase tracking-wider font-extrabold text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
                                                                    Wishlist
                                                                </span>
                                                            )}

                                                            {/* Quick Zoom Button */}
                                                            <button
                                                                type="button"
                                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onFocusPlace(place); }}
                                                                className="p-1 rounded-lg bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-150 dark:hover:bg-zinc-700/80 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 cursor-pointer transition-colors"
                                                                title="Locate on map"
                                                            >
                                                                <MapPin size={12} />
                                                            </button>

                                                            {/* Delete Button */}
                                                            <button
                                                                type="button"
                                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeletePlaceSingle(place.id, place.name); }}
                                                                className="p-1 rounded-lg bg-zinc-50 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-950/30 border border-zinc-200 dark:border-zinc-700 hover:border-red-200 dark:hover:border-red-900/50 text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 cursor-pointer transition-colors"
                                                                title="Delete from list"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>

                                                    </div>
                                                );
                                            }

                                            // Classic Grid Layout (redesigned to exactly two columns)
                                            return (
                                                <div
                                                    ref={draggableProvided.innerRef}
                                                    {...draggableProvided.draggableProps}
                                                    {...draggableProvided.dragHandleProps}
                                                    onClick={() => onFocusPlace(place)}
                                                    className={`w-full p-2 rounded-xl border shadow-sm cursor-grab active:cursor-grabbing transition-all relative ${isPlanned ? "bg-surface border-accent hover:border-primary/50" : "bg-amber-500/[0.04] border-amber-300/60 dark:border-amber-500/20 hover:border-amber-400"} ${snapshot.isDragging ? "ring-2 ring-primary rotate-2 z-50 animate-pulse bg-surface/90" : ""} ${selectedPlaceIds.has(place.id) ? "ring-2 ring-primary border-primary" : ""}`}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSelection(place.id); }}
                                                        className="absolute top-2 right-2 z-20 h-5 w-5 rounded border bg-surface/90 backdrop-blur-sm text-[11px] leading-none font-bold flex items-center justify-center cursor-pointer"
                                                        aria-label={selectedPlaceIds.has(place.id) ? "Unselect place" : "Select place"}
                                                    >
                                                        {selectedPlaceIds.has(place.id) ? "✓" : ""}
                                                    </button>
                                                    <div className="aspect-video w-full bg-gray-100 dark:bg-zinc-800 rounded-lg overflow-hidden mb-2 relative">
                                                        {place.image ? (
                                                            <img src={place.image} alt={place.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="flex items-center justify-center h-full text-muted"><MapPin size={16} /></div>
                                                        )}
                                                    </div>
                                                    <h4 className="font-bold text-[11px] text-text truncate leading-tight">{place.name}</h4>
                                                    <p className="text-[9px] text-muted capitalize truncate mt-0.5">{place.type}</p>
                                                    <div className="mt-1.5 flex items-center justify-between gap-1 flex-wrap">
                                                        {isPlanned ? (
                                                            <span className="inline-flex text-[8px] uppercase tracking-wider font-extrabold text-teal-700 dark:text-teal-400 bg-teal-500/10 border border-teal-500/20 rounded-full px-1.5 py-0.5">
                                                                Planned
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex text-[8px] uppercase tracking-wider font-extrabold text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-1.5 py-0.5">
                                                                Wishlist
                                                            </span>
                                                        )}
                                                        <div className="flex items-center gap-1.5 ml-auto">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onFocusPlace(place); }}
                                                                className="p-1 rounded-lg bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-150 dark:hover:bg-zinc-700/80 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 cursor-pointer transition-colors"
                                                                title="Locate on map"
                                                            >
                                                                <MapPin size={11} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeletePlaceSingle(place.id, place.name); }}
                                                                className="p-1 rounded-lg bg-zinc-50 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-950/30 border border-zinc-200 dark:border-zinc-700 hover:border-red-200 dark:hover:border-red-900/50 text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 cursor-pointer transition-colors"
                                                                title="Delete from list"
                                                            >
                                                                <Trash2 size={11} />
                                                            </button>
                                                        </div>

                                                    </div>
                                                </div>
                                            );
                                        }}
                                    </Draggable>
                                );
                            })}
                            {provided.placeholder}
                            {statusFilteredPlaces.length === 0 && (
                                <div className="w-full text-center text-muted text-xs py-6 italic font-medium">
                                    No places found. Search above or change filter options!
                                </div>
                            )}
                        </div>
                    )}
                </Droppable>
            </div>
        </div>
    );
}
