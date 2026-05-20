"use client";

import { Trash2 } from "lucide-react";
import { Place, ItineraryItem } from "@/lib/types";
import { useTripContext } from "@/lib/contexts/TripContext";
import { useToast } from "@/lib/contexts/ToastContext";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { DaySection } from "@/components/trip/DaySection";

function isEditableItem(item: ItineraryItem): boolean {
    return !item.itemType || item.itemType === "itinerary";
}

interface ItineraryPanelProps {
    tripId: string;
    selectedItems: Set<string>;
    onToggleSelection: (itemId: string) => void;
    onClearSelection: () => void;
    onEditItem: (dayIndex: number, item: ItineraryItem, place: Place) => void;
    onEditLodging: (place: Place) => void;
    onRemoveItem: (dayIndex: number, item: ItineraryItem) => void;
    onFocusPlace: (place: Place) => void;
}

export function ItineraryPanel({
    tripId,
    selectedItems,
    onToggleSelection,
    onClearSelection,
    onEditItem,
    onEditLodging,
    onRemoveItem,
    onFocusPlace,
}: ItineraryPanelProps) {
    const { trip, refreshTrip } = useTripContext();
    const { toast } = useToast();
    const confirm = useConfirm();

    if (!trip) return null;

    const handleBulkDelete = async () => {
        const ok = await confirm({
            title: "Delete items?",
            message: `Remove ${selectedItems.size} items from your itinerary?`,
            confirmLabel: "Delete",
            danger: true,
        });
        if (!ok) return;

        const deletionPromises: Promise<Response>[] = [];
        trip.itinerary.forEach((day, dayIndex) => {
            day.items.forEach((item) => {
                if (selectedItems.has(item.id) && isEditableItem(item)) {
                    deletionPromises.push(fetch(`/api/trips/${tripId}/itinerary?day=${dayIndex}&itemId=${item.id}`, { method: "DELETE" }));
                }
            });
        });

        await Promise.all(deletionPromises);
        onClearSelection();
        toast({ type: "success", message: `Deleted ${deletionPromises.length} items` });
        await refreshTrip();
    };

    return (
        <div className="flex flex-col h-full w-full overflow-hidden">
            {/* Whiteboard Header */}
            <div className="px-6 py-4 border-b border-accent/40 bg-white/70 dark:bg-zinc-950/40 backdrop-blur-md flex items-center justify-between shrink-0">
                <div>
                    <h2 className="font-serif text-lg font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
                        <span>Trip Itinerary Whiteboard</span>
                        <span className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20 px-2.5 py-0.5 rounded-full font-sans font-bold">
                            {trip.itinerary.length} Days
                        </span>
                    </h2>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-sans tracking-wide uppercase font-semibold mt-0.5">
                        Drag & Drop cards to set times or move days
                    </p>
                </div>

                {selectedItems.size > 0 && (
                    <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-2 duration-150 shrink-0">
                        <span className="font-bold text-red-600 dark:text-red-500 text-xs">{selectedItems.size} selected</span>
                        <button onClick={handleBulkDelete} className="text-red-600 dark:text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1 cursor-pointer">
                            <Trash2 size={13} /> Delete
                        </button>
                    </div>
                )}
            </div>

            {/* Horizontal Kanban Columns Scroll Area */}
            <div className="flex-1 overflow-x-auto custom-scrollbar p-6 flex flex-row gap-6 min-h-0 select-none pb-8 items-stretch">
                {trip.itinerary.map((day, dayIndex) => (
                    <div 
                        key={day.date} 
                        className="w-[280px] sm:w-[320px] shrink-0 h-full flex flex-col bg-zinc-50/20 dark:bg-zinc-900/5 border border-accent/40 dark:border-zinc-800 rounded-2xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] overflow-hidden transition-all duration-200"
                    >
                        <DaySection
                            day={day}
                            dayIndex={dayIndex}
                            places={trip.places}
                            selectedItems={selectedItems}
                            onToggleSelection={onToggleSelection}
                            onEditItem={onEditItem}
                            onEditLodging={onEditLodging}
                            onRemoveItem={onRemoveItem}
                            onFocusPlace={onFocusPlace}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
