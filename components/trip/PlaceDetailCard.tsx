"use client";

import { Place } from "@/lib/types";
import { X, MapPin, Globe, Star, Plus, Check, Clock3, WalletCards, Heart, Calendar } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatDateOnly } from "@/lib/date";

const WEEK_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
type WeekDay = (typeof WEEK_DAYS)[number];

const DAY_SHORT_LABELS: Record<WeekDay, string> = {
    Sunday: "Su",
    Monday: "Mo",
    Tuesday: "Tu",
    Wednesday: "We",
    Thursday: "Th",
    Friday: "Fr",
    Saturday: "Sa",
};

function parseOpeningHoursByDay(openingHours: string[]) {
    const byDay: Partial<Record<WeekDay, string>> = {};

    for (const line of openingHours) {
        const separatorIndex = line.indexOf(":");
        if (separatorIndex === -1) continue;

        const rawDay = line.slice(0, separatorIndex).trim().toLowerCase();
        const matchedDay = WEEK_DAYS.find((day) => day.toLowerCase() === rawDay);
        if (!matchedDay) continue;

        const value = line.slice(separatorIndex + 1).trim();
        if (value) {
            byDay[matchedDay] = value;
        }
    }

    return byDay;
}

function isClosedText(value?: string): boolean {
    if (!value) return false;
    return value.toLowerCase().includes("closed");
}

export function PlaceDetailCard({
    place,
    onClose,
    onSaveWishlist,
    isSaved = false,
    itineraryDays = [],
    onAddToItinerary,
    className = "",
}: {
    place: Place;
    onClose: () => void;
    onSaveWishlist?: (place: Place) => void;
    isSaved?: boolean;
    itineraryDays?: Array<{ date: string }>;
    onAddToItinerary?: (place: Place, dayIndex: number) => Promise<void>;
    className?: string;
}) {
    const [showAllHours, setShowAllHours] = useState(false);
    const [showDaySelector, setShowDaySelector] = useState(false);

    useEffect(() => {
        setShowAllHours(false);
        setShowDaySelector(false);
    }, [place.id]);

    const handleDaySelect = (idx: number) => {
        setShowDaySelector(false);
        if (onAddToItinerary) {
            void onAddToItinerary(place, idx);
        }
    };

    const priceText = useMemo(() => {
        if (typeof place.priceLevel !== "number" || place.priceLevel <= 0) return "Not available";
        return "$".repeat(Math.min(place.priceLevel, 4));
    }, [place.priceLevel]);

    const openingHoursSummary = useMemo(() => {
        if (!place.openingHours || place.openingHours.length === 0) return null;

        const byDay = parseOpeningHoursByDay(place.openingHours);
        const hasParsedDays = Object.keys(byDay).length > 0;
        const todayDay = WEEK_DAYS[new Date().getDay()];
        const todayHours = byDay[todayDay];
        const closedDays = WEEK_DAYS.filter((day) => isClosedText(byDay[day]));

        return {
            byDay,
            hasParsedDays,
            todayDay,
            todayHours,
            closedDays,
        };
    }, [place.openingHours]);

    return (
        <div className={`bg-surface/95 backdrop-blur-md rounded-2xl shadow-xl border border-accent/20 overflow-hidden relative animate-in slide-in-from-bottom-4 fade-in duration-300 w-full md:w-[420px] max-h-[80vh] ${className}`}>
            <button
                onClick={onClose}
                className="absolute top-3 right-3 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full z-20 backdrop-blur-sm transition-colors"
                aria-label="Close place details"
            >
                <X size={18} />
            </button>

            <div className="p-4 border-b border-accent/30">
                <div className="flex items-start gap-3 pr-10">
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-accent/10 shrink-0 border border-accent/20">
                        {place.image ? (
                            <img src={place.image} alt={place.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted">
                                <MapPin size={26} />
                            </div>
                        )}
                    </div>

                    <div className="min-w-0">
                        <h2 className="font-display text-xl font-bold text-text leading-tight line-clamp-2">{place.name}</h2>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                            <span className="capitalize px-2 py-0.5 rounded-full bg-accent/20 text-muted">{place.type}</span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700">
                                <WalletCards size={12} />
                                {priceText}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-700">
                                <Star size={12} className="fill-current" />
                                {typeof place.rating === "number" ? place.rating.toFixed(1) : "No rating"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar max-h-[calc(80vh-132px)]">
                <div className="flex items-start gap-2 text-sm text-text/90">
                    <MapPin size={16} className="mt-0.5 text-primary/70 shrink-0" />
                    <span>{place.address || "Address not available"}</span>
                </div>

                {typeof place.typicalVisitDurationMinutes === "number" && place.typicalVisitDurationMinutes > 0 && (
                    <div className="flex items-center gap-2 text-sm text-text/90">
                        <Clock3 size={16} className="text-primary/70 shrink-0" />
                        <span>People typically spend {place.typicalVisitDurationMinutes} min here</span>
                    </div>
                )}

                <div className="rounded-xl border border-accent/30 bg-accent/5 p-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Open Times</div>
                    {openingHoursSummary && place.openingHours && place.openingHours.length > 0 ? (
                        <>
                            <div className="flex items-center gap-2 text-sm text-text/90">
                                <Clock3 size={15} className="text-primary/70 shrink-0" />
                                <span className="font-semibold">
                                    {openingHoursSummary.hasParsedDays ? openingHoursSummary.todayDay : "Today"}:
                                </span>
                                <span className={isClosedText(openingHoursSummary.todayHours) ? "text-muted" : "text-text/90"}>
                                    {openingHoursSummary.todayHours ?? "Hours unavailable"}
                                </span>
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                {WEEK_DAYS.map((day) => {
                                    const value = openingHoursSummary.byDay[day];
                                    const isClosed = isClosedText(value);
                                    const baseClasses = "h-7 min-w-7 px-2 rounded-full text-[11px] font-bold inline-flex items-center justify-center border";
                                    const variant = isClosed
                                        ? "border-accent/40 bg-surface/60 text-muted line-through decoration-2"
                                        : value
                                            ? "border-accent/60 bg-accent/15 text-text/80"
                                            : "border-accent/30 bg-surface/40 text-muted/70";

                                    return (
                                        <span key={day} className={`${baseClasses} ${variant}`} title={value || `${day}: Hours unavailable`}>
                                            {DAY_SHORT_LABELS[day]}
                                        </span>
                                    );
                                })}

                                <button
                                    type="button"
                                    onClick={() => setShowAllHours((value) => !value)}
                                    className="ml-1 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                                >
                                    {showAllHours ? "Hide times" : "Show times"}
                                </button>
                            </div>

                            {openingHoursSummary.closedDays.length > 0 && (
                                <div className="mt-2 text-[11px] text-muted">
                                    Closed: {openingHoursSummary.closedDays.join(", ")}
                                </div>
                            )}

                            {showAllHours && (
                                <div className="mt-3 space-y-1 border-t border-accent/20 pt-2">
                                    {place.openingHours.map((line, index) => (
                                        <div key={`${line}-${index}`} className="text-xs text-text/80">
                                            {line}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-xs text-muted">Open times not available.</div>
                    )}
                </div>

                <div className="space-y-3 pt-1">
                    <div className="flex items-center gap-2">
                        {onSaveWishlist && (
                            <button
                                type="button"
                                onClick={() => !isSaved && onSaveWishlist(place)}
                                className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all duration-200 cursor-pointer select-none ${
                                    isSaved
                                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/30 cursor-default"
                                        : "bg-surface hover:bg-accent/25 border-accent text-text/90 hover:scale-[1.02] active:scale-[0.98]"
                                }`}
                                title={isSaved ? "Saved in your wishlist" : "Save to Wishlist"}
                            >
                                <Heart size={14} className={isSaved ? "fill-current text-amber-500 animate-bounce" : ""} />
                                <span>{isSaved ? "Saved" : "Save to Wishlist"}</span>
                            </button>
                        )}

                        {onAddToItinerary && itineraryDays.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setShowDaySelector((prev) => !prev)}
                                className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all duration-200 cursor-pointer select-none ${
                                    showDaySelector
                                        ? "bg-primary text-white border-primary shadow-md scale-[1.02]"
                                        : "bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 border-transparent hover:scale-[1.02] active:scale-[0.98]"
                                }`}
                            >
                                <Calendar size={14} />
                                <span>Add to Itinerary</span>
                            </button>
                        )}

                        {place.website && (
                            <a
                                href={place.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-2.5 border border-accent rounded-xl text-xs font-medium hover:bg-accent/20 text-text/70 hover:text-text flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
                                title="Visit Website"
                            >
                                <Globe size={14} />
                            </a>
                        )}
                    </div>

                    {showDaySelector && itineraryDays.length > 0 && (
                        <div className="p-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.04] space-y-2 animate-in slide-in-from-top-3 fade-in duration-200">
                            <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-500">
                                <span>Select Itinerary Day</span>
                                <button
                                    type="button"
                                    onClick={() => setShowDaySelector(false)}
                                    className="text-muted hover:text-text font-bold text-[10px]"
                                >
                                    Cancel
                                </button>
                            </div>
                            <div className="flex gap-2 overflow-x-auto pb-1.5 pt-0.5 custom-scrollbar snap-x scroll-smooth">
                                {itineraryDays.map((day, idx) => {
                                    const dayLabel = `Day ${idx + 1}`;
                                    const dateLabel = formatDateOnly(day.date, undefined, { month: "short", day: "numeric" });
                                    return (
                                        <button
                                            key={day.date}
                                            type="button"
                                            onClick={() => handleDaySelect(idx)}
                                            className="snap-start shrink-0 w-24 p-2 rounded-xl border border-accent/40 bg-surface/80 hover:border-amber-500/60 hover:bg-amber-500/[0.06] text-center transition-all duration-200 hover:scale-[1.04] active:scale-[0.96] shadow-sm cursor-pointer"
                                        >
                                            <div className="text-[11px] font-extrabold text-text leading-none">{dayLabel}</div>
                                            <div className="text-[9px] text-muted font-semibold mt-1 leading-none">{dateLabel}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
