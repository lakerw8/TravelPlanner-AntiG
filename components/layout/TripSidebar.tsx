"use client";

import { Plane, BedDouble, Utensils, Bookmark } from "lucide-react";
import { useState, useMemo } from "react";
import { AddFlightModal } from "@/components/trip/AddFlightModal";
import { AddLodgingModal, ManagedLodging } from "@/components/trip/AddLodgingModal";
import { formatDateOnly } from "@/lib/date";
import { useParams } from "next/navigation";
import { useTripContext } from "@/lib/contexts/TripContext";

export function TripSidebar() {
    const [isFlightOpen, setIsFlightOpen] = useState(false);
    const [isLodgingOpen, setIsLodgingOpen] = useState(false);
    const params = useParams();
    const tripId = params.id as string;
    const { trip, refreshTrip } = useTripContext();

    const lodgings = useMemo<ManagedLodging[]>(() => {
        if (!trip) return [];

        const byLodgingId = new Map<string, ManagedLodging>();
        for (const day of trip.itinerary) {
            for (const item of day.items) {
                if (item.itemType !== "lodging" || !item.sourceId) continue;
                const place = trip.places[item.placeId];
                if (!place) continue;

                const existing = byLodgingId.get(item.sourceId);
                if (!existing || item.subtype === "checkin") {
                    byLodgingId.set(item.sourceId, {
                        id: item.sourceId,
                        place,
                    });
                }
            }
        }

        return Array.from(byLodgingId.values()).sort((a, b) =>
            (a.place.checkIn ?? "").localeCompare(b.place.checkIn ?? ""),
        );
    }, [trip]);

    const dayAccents = [
        { dot: "bg-primary", text: "text-primary", hover: "hover:bg-primary/10" },
        { dot: "bg-emerald-500", text: "text-emerald-600", hover: "hover:bg-emerald-50" },
        { dot: "bg-rose-500", text: "text-rose-600", hover: "hover:bg-rose-50" },
        { dot: "bg-orange-500", text: "text-orange-600", hover: "hover:bg-orange-50" },
        { dot: "bg-sky-500", text: "text-sky-600", hover: "hover:bg-sky-50" },
        { dot: "bg-indigo-500", text: "text-indigo-600", hover: "hover:bg-indigo-50" },
    ] as const;

    const emitScrollToSection = (sectionId: string) => {
        if (typeof window === "undefined") return;
        window.dispatchEvent(new CustomEvent("trip:scroll-to-section", {
            detail: { sectionId },
        }));
    };

    if (!trip) return <div className="p-6">Loading...</div>;

    return (
        <>
            <aside className="hidden lg:flex w-1/5 min-w-[250px] bg-gradient-to-b from-surface to-background h-full border-r border-accent flex-col overflow-hidden">
                <div className="p-6 border-b border-accent">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-accent">
                            <img src={trip.coverImage || "https://via.placeholder.com/150"} className="w-full h-full object-cover" alt="Cover" />
                        </div>
                        <div>
                            <h2 className="font-display text-lg font-bold leading-tight text-text line-clamp-2">{trip.title}</h2>
                            <p className="text-xs text-muted">
                                {formatDateOnly(trip.startDate)} - {formatDateOnly(trip.endDate)}
                            </p>
                        </div>
                    </div>
                    <nav className="space-y-1">
                        <button
                            type="button"
                            onClick={() => emitScrollToSection("lists-section")}
                            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-muted hover:bg-accent transition-colors text-left"
                        >
                            <Bookmark size={18} />
                            <span className="text-sm">Saved Lists</span>
                        </button>
                        <button onClick={() => setIsFlightOpen(true)} className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-muted hover:bg-accent transition-colors">
                            <Plane size={18} />
                            <span className="text-sm">Flights</span>
                        </button>
                        <button onClick={() => setIsLodgingOpen(true)} className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-muted hover:bg-accent transition-colors">
                            <BedDouble size={18} />
                            <span className="text-sm">Lodging</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => emitScrollToSection("lists-section")}
                            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-muted hover:bg-accent transition-colors text-left"
                        >
                            <Utensils size={18} />
                            <span className="text-sm">Dining</span>
                        </button>
                    </nav>
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-hide p-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted mb-4 px-2">Itinerary</h3>
                    <ul className="space-y-4 relative border-l border-accent ml-3 pl-4">
                        {trip.itinerary.map((day, i) => {
                            const accent = dayAccents[i % dayAccents.length];
                            const itemCount = day.items.filter((item) => !item.itemType || item.itemType === "itinerary").length;
                            return (
                                <li key={i} className="relative">
                                    <div className={`absolute -left-[21px] top-2 h-2.5 w-2.5 rounded-full ${accent.dot} ring-4 ring-background`}></div>
                                    <button
                                        type="button"
                                        onClick={() => emitScrollToSection(`day-${i}`)}
                                        className={`w-full text-left block group rounded-lg px-2 py-1 transition-colors ${accent.hover}`}
                                    >
                                        <span className={`text-xs font-bold block ${accent.text}`}>Day {i + 1}</span>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-text group-hover:text-primary transition-colors">
                                                {formatDateOnly(day.date, undefined, { month: "short", day: "numeric" })}
                                            </span>
                                            {itemCount > 0 && (
                                                <span className="text-[10px] text-muted">{itemCount} {itemCount === 1 ? "item" : "items"}</span>
                                            )}
                                        </div>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </aside>

            <AddFlightModal
                isOpen={isFlightOpen}
                onClose={() => setIsFlightOpen(false)}
                tripId={tripId}
            />

            <AddLodgingModal
                isOpen={isLodgingOpen}
                onClose={() => setIsLodgingOpen(false)}
                tripId={tripId}
                lodgings={lodgings}
                onRefresh={refreshTrip}
            />
        </>
    );
}
