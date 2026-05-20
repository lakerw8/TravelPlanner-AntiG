"use client";

import { Place, ItineraryItem, TripDay } from "@/lib/types";
import { formatDateOnly } from "@/lib/date";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { PlaceCard } from "@/components/trip/PlaceCard";
import { useTripContext } from "@/lib/contexts/TripContext";

const DAY_BORDER_COLORS = [
    "#D4AF37",
    "#10B981",
    "#F43F5E",
    "#F97316",
    "#0EA5E9",
    "#6366F1",
];

function isEditableItem(item: ItineraryItem): boolean {
    return !item.itemType || item.itemType === "itinerary";
}

interface DaySectionProps {
    day: TripDay;
    dayIndex: number;
    places: Record<string, Place>;
    selectedItems: Set<string>;
    onToggleSelection: (itemId: string) => void;
    onEditItem: (dayIndex: number, item: ItineraryItem, place: Place) => void;
    onEditLodging: (place: Place) => void;
    onRemoveItem: (dayIndex: number, item: ItineraryItem) => void;
    onFocusPlace: (place: Place) => void;
}

export function DaySection({
    day,
    dayIndex,
    places,
    selectedItems,
    onToggleSelection,
    onEditItem,
    onEditLodging,
    onRemoveItem,
    onFocusPlace,
}: DaySectionProps) {
    const { activeDayIndex, setActiveDayIndex } = useTripContext();
    const virtualItems = day.items.filter((item) => !isEditableItem(item));
    const itineraryItems = day.items.filter((item) => isEditableItem(item));
    const borderColor = DAY_BORDER_COLORS[dayIndex % DAY_BORDER_COLORS.length];
    const isActive = activeDayIndex === dayIndex;

    return (
        <div 
            onClick={() => setActiveDayIndex(dayIndex)}
            className={`h-full flex flex-col min-h-0 transition-all duration-200 cursor-pointer rounded-2xl ${isActive ? 'ring-2 ring-amber-500/50 bg-white dark:bg-zinc-900 shadow-md' : 'hover:bg-white/80 dark:hover:bg-zinc-800/40 bg-white/40 dark:bg-zinc-900/10'}`}
        >
            {/* Header section (fixed at top) */}
            <div className={`p-4 border-b border-accent/40 shrink-0 flex items-center justify-between rounded-t-2xl ${isActive ? 'bg-amber-500/5' : 'bg-surface/20'}`}>
                <div className="min-w-0">
                    <h3 className={`font-serif text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5`}>
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0`} style={{ backgroundColor: borderColor }} />
                        <span className="truncate">Day {dayIndex + 1}</span>
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-sans tracking-wide truncate mt-0.5 font-medium">
                        {formatDateOnly(day.date, "en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </p>
                </div>
                {(itineraryItems.length > 0 || virtualItems.length > 0) && (
                    <span className="text-[9px] uppercase tracking-wider font-extrabold text-amber-700 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full shrink-0">
                        {itineraryItems.length + virtualItems.length} items
                    </span>
                )}
            </div>

            {/* Scrollable listing zone */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3 min-h-0">
                {/* Virtual items (flights/lodging checkin/checkout) */}
                {virtualItems.length > 0 && (
                    <div className="space-y-2 mb-2 shrink-0">
                        {virtualItems.map((item, itemIndex) => {
                            const place = places[item.placeId];
                            if (!place) return null;

                            return (
                                <PlaceCard
                                    key={item.id}
                                    place={place}
                                    previousPlace={itemIndex > 0 ? places[virtualItems[itemIndex - 1].placeId] : undefined}
                                    item={item}
                                    isSelected={false}
                                    isDragging={false}
                                    onToggleSelection={() => undefined}
                                    onEdit={() => {
                                        if (place.type === "lodging") {
                                            onEditLodging(place);
                                        }
                                    }}
                                    onRemove={() => onRemoveItem(dayIndex, item)}
                                    onCardClick={() => onFocusPlace(place)}
                                />
                            );
                        })}
                    </div>
                )}

                {/* Draggable activity items */}
                <Droppable droppableId={`day-${dayIndex}`}>
                    {(provided, snapshot) => (
                        <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`space-y-3 min-h-[150px] transition-colors rounded-xl p-1 pb-12 ${snapshot.isDraggingOver ? "bg-amber-500/5 border border-amber-500/20" : ""}`}
                        >
                            {itineraryItems.map((item, itemIndex) => {
                                const place = places[item.placeId];
                                if (!place) return null;

                                const isSelected = selectedItems.has(item.id);
                                const previousItineraryPlace = itemIndex > 0
                                    ? places[itineraryItems[itemIndex - 1].placeId]
                                    : undefined;

                                return (
                                    <Draggable key={item.id} draggableId={item.id} index={itemIndex}>
                                        {(draggableProvided, dragSnapshot) => (
                                            <div
                                                ref={draggableProvided.innerRef}
                                                {...draggableProvided.draggableProps}
                                                {...draggableProvided.dragHandleProps}
                                                className="transition-transform"
                                            >
                                                <PlaceCard
                                                    place={place}
                                                    previousPlace={previousItineraryPlace}
                                                    item={item}
                                                    isSelected={isSelected}
                                                    isDragging={dragSnapshot.isDragging}
                                                    onToggleSelection={() => onToggleSelection(item.id)}
                                                    onEdit={() => onEditItem(dayIndex, item, place)}
                                                    onRemove={() => onRemoveItem(dayIndex, item)}
                                                    onCardClick={() => onFocusPlace(place)}
                                                />
                                            </div>
                                        )}
                                    </Draggable>
                                );
                            })}
                            {provided.placeholder}
                            {itineraryItems.length === 0 && (
                                <div className="h-28 border-2 border-dashed border-accent hover:border-amber-500/40 rounded-xl flex flex-col items-center justify-center text-zinc-400 hover:text-zinc-500 text-xs text-center p-4 transition-colors bg-surface/10">
                                    <span className="font-semibold block mb-1">Unscheduled Day</span>
                                    Drag activities here
                                </div>
                            )}
                        </div>
                    )}
                </Droppable>
            </div>
        </div>
    );
}
