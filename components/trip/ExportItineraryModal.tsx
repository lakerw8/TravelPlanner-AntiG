"use client";

import React, { useRef, useState, useTransition } from "react";
import { useTripContext } from "@/lib/contexts/TripContext";
import { formatDateOnly } from "@/lib/date";
import { toPng } from "html-to-image";
import { Download, Smartphone, X, Calendar, Plane, BedDouble, MapPin, Sparkles, AlertCircle } from "lucide-react";
import { useToast } from "@/lib/contexts/ToastContext";
import { Place } from "@/lib/types";

function getPlaceCategory(place: Place): string {
    const name = place.name.toLowerCase();
    const type = (place.type || "").toLowerCase();
    
    if (type === "lodging" || name.includes("hotel") || name.includes("inn") || name.includes("hostel") || name.includes("stay")) {
        return "lodging";
    }
    if (type === "restaurant" || type.includes("food") || type.includes("dining") || 
        name.includes("food") || name.includes("restaurant") || name.includes("dining") || name.includes("sushi") || name.includes("bar") || name.includes("kitchen") || name.includes("ramen") || name.includes("eatery")) {
        return "dining";
    }
    if (name.includes("cafe") || name.includes("coffee") || name.includes("tea") || name.includes("bakery") || name.includes("dessert") || name.includes("roaster")) {
        return "cafe";
    }
    if (type === "shopping" || type.includes("store") || type.includes("mall") || type.includes("shop") || type.includes("boutique") || type.includes("market") || type.includes("retail") ||
        name.includes("shop") || name.includes("store") || name.includes("mall") || name.includes("market") || name.includes("plaza") || name.includes("center") || name.includes("loft") || name.includes("gift") || name.includes("souvenir") || name.includes("outlet") || name.includes("fashion") || name.includes("department") || name.includes("boutique")) {
        return "shopping";
    }
    return place.type || "sightseeing";
}

interface ExportItineraryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const dayColors = [
    "#D4AF37", // Luxury Gold
    "#F43F5E", // Vibrant Rose
    "#14B8A6", // Emerald Teal
    "#8B5CF6", // Royal Violet
    "#3B82F6", // Electric Blue
    "#F97316", // Sunny Orange
    "#EC4899", // Hot Pink
];

function getDayColor(index: number): string {
    return dayColors[index % dayColors.length];
}

export function ExportItineraryModal({ isOpen, onClose }: ExportItineraryModalProps) {
    const { trip } = useTripContext();
    const { toast } = useToast();
    const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null); // null means All Days
    const [isGenerating, startGenerating] = useTransition();
    const exportCardRef = useRef<HTMLDivElement>(null);

    if (!isOpen || !trip) return null;

    // Filter dynamic itinerary days based on selection
    const displayedDays = selectedDayIndex === null 
        ? trip.itinerary 
        : [trip.itinerary[selectedDayIndex]];

    const displayedDayIndices = selectedDayIndex === null
        ? trip.itinerary.map((_, i) => i)
        : [selectedDayIndex];

    const handleExport = () => {
        if (!exportCardRef.current) return;
        
        startGenerating(async () => {
            try {
                // html-to-image is called with high pixelRatio and custom cache-busting to bypass browser caches
                const dataUrl = await toPng(exportCardRef.current!, {
                    pixelRatio: 2.5,
                    style: {
                        transform: "scale(1)",
                        transformOrigin: "top left",
                    },
                    cacheBust: true,
                });

                // Create a triggerable download anchor link
                const link = document.createElement("a");
                const safeTitle = trip.title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
                const scopeLabel = selectedDayIndex === null ? "all_days" : `day_${selectedDayIndex + 1}`;
                
                link.download = `${safeTitle}_itinerary_${scopeLabel}.png`;
                link.href = dataUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                toast({
                    type: "success",
                    message: "Itinerary card generated and downloaded successfully!",
                });
            } catch (err) {
                console.error("Export failure:", err);
                toast({
                    type: "error",
                    message: "Failed to generate image. Please try again.",
                });
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto">
            <div className="bg-white dark:bg-zinc-900 border border-amber-500/20 w-[95%] max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-[80vh] relative animate-in fade-in zoom-in-95 duration-200">
                
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 p-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                    <X size={20} />
                </button>

                {/* Left Panel: Settings and Actions */}
                <div className="w-full md:w-2/5 p-6 md:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-zinc-100 dark:border-zinc-800 overflow-y-auto shrink-0 bg-zinc-50/50 dark:bg-zinc-950/20">
                    <div className="space-y-6">
                        <div>
                            <h3 className="font-serif text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                                <Smartphone className="text-amber-500" size={24} /> Mobile Export
                            </h3>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                                Generate a high-resolution long-scroll timeline card. Keep it on your phone for quick offline access, or share it with your travel group!
                            </p>
                        </div>

                        {/* Day Selector Scope */}
                        <div className="space-y-2.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                Export Scope
                            </label>
                            <div className="flex flex-col gap-1.5">
                                <button
                                    onClick={() => setSelectedDayIndex(null)}
                                    className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold text-left transition-all duration-200 flex items-center justify-between border cursor-pointer ${
                                        selectedDayIndex === null
                                            ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-sm"
                                            : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                                    }`}
                                >
                                    <span>All Days (Unified Timeline)</span>
                                    <span className="text-[10px] uppercase font-bold opacity-60">
                                        {trip.itinerary.length} Days
                                    </span>
                                </button>

                                {trip.itinerary.map((day, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedDayIndex(idx)}
                                        className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold text-left transition-all duration-200 flex items-center justify-between border cursor-pointer ${
                                            selectedDayIndex === idx
                                                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-sm"
                                                : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="w-2 h-2 rounded-full shrink-0"
                                                style={{ backgroundColor: getDayColor(idx) }}
                                            />
                                            <span>Day {idx + 1}</span>
                                        </div>
                                        <span className="text-[10px] text-zinc-400 font-medium">
                                            {formatDateOnly(day.date, undefined, { month: "short", day: "numeric" })}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Export Tip */}
                        <div className="p-3.5 bg-amber-500/5 border border-amber-500/10 rounded-xl flex gap-2.5">
                            <AlertCircle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-amber-600 dark:text-amber-500/90 leading-relaxed font-medium">
                                For best visual quality, your vertical layout is locked to a fixed 420px width. Fonts and images will be fully preserved in the downloaded PNG.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleExport}
                        disabled={isGenerating}
                        className="w-full mt-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white font-bold text-sm shadow-lg shadow-amber-500/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {isGenerating ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Generating Image...</span>
                            </>
                        ) : (
                            <>
                                <Download size={16} />
                                <span>Download Mobile Image</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Right Panel: Scrollable Live Preview */}
                <div className="flex-1 p-6 md:p-8 overflow-y-auto flex justify-center bg-zinc-100 dark:bg-zinc-950/60 custom-scrollbar select-none">
                    
                    {/* The actually captured DOM element (has natural full height, no scrollbars itself, so it's captured in full) */}
                    <div 
                        ref={exportCardRef}
                        className="w-[420px] bg-white text-zinc-950 shadow-2xl rounded-2xl overflow-hidden border border-zinc-200 flex flex-col shrink-0"
                        style={{ height: 'max-content' }}
                    >
                        {/* Luxury Banner Cover */}
                        <div className="h-44 relative bg-zinc-900 shrink-0">
                            <img
                                src={trip.coverImage || "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop"}
                                className="w-full h-full object-cover opacity-70"
                                alt="Trip Banner"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
                            
                            <div className="absolute bottom-5 left-5 right-5 text-white">
                                <span className="text-[10px] font-sans font-bold bg-amber-500 text-zinc-950 px-2.5 py-0.5 rounded-full uppercase tracking-widest inline-flex items-center gap-1 shadow-sm mb-2.5">
                                    <Sparkles size={8} /> Travel Itinerary
                                </span>
                                <h1 className="font-serif text-2xl font-bold leading-tight tracking-wide text-zinc-50 flex items-center gap-1.5">
                                    {trip.title}
                                </h1>
                                <p className="text-[10px] text-zinc-300 font-sans tracking-wide uppercase font-semibold mt-1">
                                    {formatDateOnly(trip.startDate)} — {formatDateOnly(trip.endDate)}
                                </p>
                            </div>
                        </div>

                        {/* Card Timeline Content */}
                        <div className="p-6 flex-1 space-y-8 bg-zinc-50/50">
                            
                            {displayedDays.map((day, dayIdx) => {
                                const canonicalDayIdx = displayedDayIndices[dayIdx];
                                const activeColor = getDayColor(canonicalDayIdx);

                                // Filter scheduled itinerary items and sort by startTime
                                const activeItems = day.items.filter(item => !item.itemType || item.itemType === "itinerary");
                                const flights = day.items.filter(item => item.itemType === "flight");
                                const activeLodging = day.items.find(item => item.itemType === "lodging" && item.subtype === "checkin");

                                return (
                                    <div key={day.date} className="space-y-5">
                                        
                                        {/* Day Segment Header */}
                                        <div 
                                            className="flex items-center gap-3.5 pb-2 border-b-2"
                                            style={{ borderColor: activeColor }}
                                        >
                                            <div 
                                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md shadow-amber-500/5 shrink-0"
                                                style={{ backgroundColor: activeColor }}
                                            >
                                                {canonicalDayIdx + 1}
                                            </div>
                                            <div>
                                                <h2 className="font-serif text-base font-bold text-zinc-900 leading-tight">
                                                    Day {canonicalDayIdx + 1}
                                                </h2>
                                                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                                                    {formatDateOnly(day.date, undefined, { weekday: "long", month: "long", day: "numeric" })}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Timeline Loop */}
                                        <div className="relative border-l border-zinc-200/80 ml-4 pl-5 space-y-6 pb-2">
                                            
                                            {/* 1. Daily Lodging Indicator */}
                                            {activeLodging && (() => {
                                                const place = trip.places[activeLodging.placeId];
                                                return place ? (
                                                    <div className="relative flex flex-col gap-1.5 p-3.5 bg-zinc-50 border border-zinc-200/60 rounded-xl shadow-sm">
                                                        {/* Dot Anchor on Line */}
                                                        <div 
                                                            className="absolute -left-[27px] top-[14px] w-3 h-3 rounded-full border-2 border-white flex items-center justify-center text-white shadow-sm shrink-0"
                                                            style={{ backgroundColor: activeColor }}
                                                        />
                                                        <div className="flex items-center gap-1.5 text-zinc-800 text-[10px] font-bold uppercase tracking-wider">
                                                            <BedDouble size={12} className="text-zinc-600" />
                                                            <span>Lodging Check-In</span>
                                                        </div>
                                                        <h3 className="font-sans text-xs font-bold text-zinc-900 leading-snug">
                                                            {place.name}
                                                        </h3>
                                                        {place.address && (
                                                            <p className="text-[10px] text-zinc-500 flex items-center gap-1">
                                                                <MapPin size={9} /> {place.address}
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : null;
                                            })()}

                                            {/* 2. Daily Flight Nodes */}
                                            {flights.map((item) => {
                                                const flight = trip.flights?.find(f => f.id === item.sourceId);
                                                if (!flight) return null;
                                                return (
                                                    <div key={item.id} className="relative flex flex-col gap-1.5 p-3.5 bg-zinc-50 border border-zinc-200/60 rounded-xl shadow-sm">
                                                        {/* Dot Anchor on Line */}
                                                        <div 
                                                            className="absolute -left-[27px] top-[14px] w-3 h-3 rounded-full border-2 border-white flex items-center justify-center text-white shadow-sm shrink-0"
                                                            style={{ backgroundColor: activeColor }}
                                                        />
                                                        <div className="flex items-center gap-1.5 text-zinc-800 text-[10px] font-bold uppercase tracking-wider">
                                                            <Plane size={12} className="text-zinc-600" />
                                                            <span>Flight Scheduled</span>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-4">
                                                            <div>
                                                                <h3 className="font-sans text-xs font-bold text-zinc-900">
                                                                    {flight.airline} {flight.flightNumber}
                                                                </h3>
                                                                <p className="text-[10px] text-zinc-500">
                                                                    {flight.departureAirport || "N/A"} → {flight.arrivalAirport || "N/A"}
                                                                </p>
                                                            </div>
                                                            {flight.departureTime && (
                                                                <span className="text-[10px] font-bold bg-zinc-200 text-zinc-800 px-2 py-0.5 rounded">
                                                                    {(() => {
                                                                        try {
                                                                            const date = new Date(flight.departureTime);
                                                                            if (isNaN(date.getTime())) {
                                                                                const match = flight.departureTime.match(/\d{2}:\d{2}/);
                                                                                return match ? match[0] : flight.departureTime;
                                                                            }
                                                                            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                                                                        } catch {
                                                                            return flight.departureTime;
                                                                        }
                                                                    })()}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {/* 3. Daily Scheduled Stop Nodes */}
                                            {activeItems.map((item, idx) => {
                                                const place = trip.places[item.placeId];
                                                if (!place) return null;
                                                return (
                                                    <div key={item.id} className="relative space-y-1">
                                                        {/* Number Bubble anchor on Line */}
                                                        <div 
                                                            className="absolute -left-[27px] top-0 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shadow-sm shrink-0 border border-white"
                                                            style={{ backgroundColor: activeColor }}
                                                        >
                                                            {idx + 1}
                                                        </div>
                                                        
                                                        <div className="flex items-baseline gap-2">
                                                            {item.startTime && (
                                                                <span className="text-[10px] font-bold text-zinc-500 whitespace-nowrap">
                                                                    {item.startTime}
                                                                </span>
                                                            )}
                                                            <h3 className="font-sans text-xs font-bold text-zinc-950 leading-snug">
                                                                {place.name}
                                                            </h3>
                                                            {(() => {
                                                                const category = getPlaceCategory(place);
                                                                return category ? (
                                                                    <span className="text-[9px] font-semibold text-zinc-400 bg-zinc-100 px-1.5 py-0.25 rounded lowercase">
                                                                        {category}
                                                                    </span>
                                                                ) : null;
                                                            })()}
                                                        </div>

                                                        {place.address && (
                                                            <p className="text-[9px] text-zinc-500 flex items-center gap-0.5">
                                                                <MapPin size={8} /> {place.address}
                                                            </p>
                                                        )}

                                                        {place.notes && (
                                                            <p className="text-[10px] text-zinc-600 bg-amber-500/5 border-l-2 border-amber-500/30 pl-2.5 py-0.5 rounded-r">
                                                                {place.notes}
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                            {activeItems.length === 0 && flights.length === 0 && !activeLodging && (
                                                <div className="relative text-[11px] text-zinc-400 italic">
                                                    <div 
                                                        className="absolute -left-[26px] top-1.5 w-2 h-2 rounded-full border border-zinc-200 bg-zinc-200"
                                                    />
                                                    No stops planned for this day
                                                </div>
                                            )}

                                        </div>

                                    </div>
                                );
                            })}

                        </div>

                        {/* Luxury Card Footer */}
                        <div className="px-6 py-5 bg-zinc-100 border-t border-zinc-200/60 flex flex-col items-center gap-1.5 shrink-0 text-center">
                            <div className="h-[1px] w-12 bg-amber-500/30 mb-0.5" />
                            <p className="font-serif text-[11px] text-zinc-800 font-bold tracking-wide flex items-center gap-1">
                                Wanderlust <Sparkles size={9} className="text-amber-500" />
                            </p>
                            <p className="text-[8px] text-zinc-400 font-medium uppercase tracking-widest">
                                Your Premium Luxury Travel Planner
                            </p>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
}
