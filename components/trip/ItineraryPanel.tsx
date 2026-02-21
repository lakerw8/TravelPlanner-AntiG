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
        <div>
            {selectedItems.size > 0 && (
                <div className="mb-6 p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between sticky top-0 z-20 backdrop-blur-md shadow-sm">
                    <span className="font-bold text-primary text-sm">{selectedItems.size} items selected</span>
                    <button onClick={handleBulkDelete} className="text-red-500 hover:text-red-700 text-sm font-bold flex items-center gap-1">
                        <Trash2 size={16} /> Delete Selected
                    </button>
                </div>
            )}

            {trip.itinerary.map((day, dayIndex) => (
                <DaySection
                    key={day.date}
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
            ))}
        </div>
    );
}
