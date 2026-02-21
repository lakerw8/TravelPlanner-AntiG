"use client";

import { Place, ItineraryItem, TripDay } from "@/lib/types";
import { formatDateOnly } from "@/lib/date";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { PlaceCard } from "@/components/trip/PlaceCard";

const DAY_BORDER_COLORS = [
    "border-primary",
    "border-emerald-500",
    "border-rose-500",
    "border-orange-500",
    "border-sky-500",
    "border-indigo-500",
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
    const virtualItems = day.items.filter((item) => !isEditableItem(item));
    const itineraryItems = day.items.filter((item) => isEditableItem(item));
    const borderColor = DAY_BORDER_COLORS[dayIndex % DAY_BORDER_COLORS.length];

    return (
        <section className="mb-12 scroll-mt-6 transition-colors" id={`day-${dayIndex}`}>
            <div className="flex items-baseline justify-between mb-6 sticky top-0 bg-surface/95 backdrop-blur py-2 z-10 border-b border-accent/50">
                <h3 className={`font-display text-2xl font-bold text-text pl-2 border-l-4 ${borderColor}`}>
                    {formatDateOnly(day.date, "en-US", { weekday: "long", month: "long", day: "numeric" })}
                </h3>
                {itineraryItems.length > 0 && (
                    <span className="text-xs text-muted">
                        {itineraryItems.length} {itineraryItems.length === 1 ? "activity" : "activities"}
                    </span>
                )}
            </div>

            <div className="space-y-4 mb-4">
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

            <Droppable droppableId={`day-${dayIndex}`}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`space-y-4 min-h-[100px] transition-colors ${snapshot.isDraggingOver ? "bg-primary/5 rounded-xl -mx-2 px-2" : ""}`}
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
                            <div className="h-24 border-2 border-dashed border-accent rounded-xl flex items-center justify-center text-muted text-sm hover:border-primary/50 transition-colors bg-surface/50">
                                Drag places here to plan this day
                            </div>
                        )}
                    </div>
                )}
            </Droppable>
        </section>
    );
}
