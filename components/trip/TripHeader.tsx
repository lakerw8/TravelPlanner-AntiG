"use client";

import { useState, useMemo } from "react";
import { Place } from "@/lib/types";
import { PlaceAutocomplete } from "@/components/trip/PlaceAutocomplete";
import { formatDateOnly } from "@/lib/date";
import { useTripContext } from "@/lib/contexts/TripContext";
import { useParams } from "next/navigation";
import { AddFlightModal } from "@/components/trip/AddFlightModal";
import { AddLodgingModal, ManagedLodging } from "@/components/trip/AddLodgingModal";
import { Plane, BedDouble, Share2, Copy, Check, Users, Sparkles, Smartphone } from "lucide-react";
import { ExportItineraryModal } from "@/components/trip/ExportItineraryModal";

interface TripHeaderProps {
    onPlaceSelect: (place: Place) => void;
}

export function TripHeader({ onPlaceSelect }: TripHeaderProps) {
    const params = useParams();
    const tripId = params.id as string;
    const { trip, collaborators, refreshTrip } = useTripContext();
    const [isFlightOpen, setIsFlightOpen] = useState(false);
    const [isLodgingOpen, setIsLodgingOpen] = useState(false);
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [copied, setCopied] = useState(false);

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

    if (!trip) return null;

    const handleCopyLink = () => {
        if (typeof window === "undefined") return;
        void navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <>
            <header className="px-6 py-3.5 bg-surface/90 border-b border-amber-500/10 backdrop-blur-md flex items-center justify-between gap-6 shrink-0 z-40 shadow-sm relative">
                {/* Trip Info & Description */}
                <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 border border-amber-500/20 shadow-md">
                        <img
                            src={trip.coverImage || "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop"}
                            className="w-full h-full object-cover"
                            alt="Trip Cover"
                        />
                    </div>
                    <div>
                        <h1 className="text-xl font-serif font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-1.5 leading-tight tracking-wide">
                            {trip.title} <Sparkles size={14} className="text-amber-500 shrink-0" />
                        </h1>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-sans tracking-wide uppercase font-semibold">
                            {formatDateOnly(trip.startDate)} — {formatDateOnly(trip.endDate)}
                        </p>
                    </div>
                </div>

                {/* Google Places Search */}
                <div className="flex-1 max-w-lg mx-6">
                    <PlaceAutocomplete
                        onSelect={onPlaceSelect}
                        tripLocation={trip.lat && trip.lng ? { lat: trip.lat, lng: trip.lng } : undefined}
                        placeholder={`Search & add places to wishlist...`}
                        className="w-full"
                    />
                </div>

                {/* Multiplayer Engine & Action Buttons */}
                <div className="flex items-center gap-5">
                    {/* Active Collaborators list */}
                    <div className="flex items-center gap-2">
                        {collaborators.length > 0 && (
                            <div className="flex -space-x-2.5 overflow-hidden">
                                {collaborators.map((c) => (
                                    <div
                                        key={c.presenceGuid}
                                        className="w-8 h-8 rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center text-[10px] font-bold text-white shadow-md relative group shrink-0 cursor-default transition-all duration-200 hover:scale-110 hover:z-10"
                                        style={{ backgroundColor: c.color }}
                                    >
                                        {c.nickname.substring(0, 2).toUpperCase()}
                                        <span className="absolute bottom-full mb-2 hidden group-hover:block bg-zinc-950 text-white text-[10px] py-1 px-2.5 rounded-lg whitespace-nowrap shadow-xl select-none pointer-events-none z-[100]">
                                            {c.nickname}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider hidden xl:inline-block">
                            {collaborators.length} Online
                        </span>
                    </div>

                    {/* Booking/Trip Management Actions */}
                    <div className="flex items-center gap-2 border-l border-zinc-200 dark:border-zinc-800 pl-4">
                        <button
                            onClick={() => setIsFlightOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-600 dark:text-amber-500 text-xs font-bold transition-all duration-150 cursor-pointer shadow-sm active:scale-95"
                        >
                            <Plane size={13} />
                            <span>Flights</span>
                        </button>

                        <button
                            onClick={() => setIsLodgingOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-600 dark:text-amber-500 text-xs font-bold transition-all duration-150 cursor-pointer shadow-sm active:scale-95"
                        >
                            <BedDouble size={13} />
                            <span>Lodging</span>
                        </button>

                        <button
                            onClick={() => setIsExportOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-600 dark:text-amber-500 text-xs font-bold transition-all duration-150 cursor-pointer shadow-sm active:scale-95"
                        >
                            <Smartphone size={13} />
                            <span>Export Card</span>
                        </button>

                        <button
                            onClick={() => setIsInviteOpen(true)}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white text-xs font-bold shadow-md shadow-amber-500/10 transition-all duration-150 cursor-pointer active:scale-95"
                        >
                            <Share2 size={13} />
                            <span>Invite</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Invite Modal */}
            {isInviteOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white/95 dark:bg-zinc-900/95 border border-amber-500/20 w-[420px] rounded-2xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="font-serif text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2 mb-2">
                            <Users size={18} className="text-amber-500" /> Share Trip
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-sans mb-4">
                            Send this link to your group. Anyone with the URL can view and edit the trip in real-time, no login required!
                        </p>

                        <div className="flex gap-2 mb-5">
                            <input
                                type="text"
                                readOnly
                                value={typeof window !== "undefined" ? window.location.href : ""}
                                className="flex-1 px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-600 dark:text-zinc-300 focus:outline-none"
                            />
                            <button
                                onClick={handleCopyLink}
                                className="px-4 py-2 bg-zinc-950 dark:bg-zinc-800 hover:bg-zinc-900 dark:hover:bg-zinc-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer select-none transition-all duration-150 active:scale-95"
                            >
                                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                <span>{copied ? "Copied" : "Copy"}</span>
                            </button>
                        </div>

                        <div className="flex justify-end pt-2 border-t border-zinc-100 dark:border-zinc-800">
                            <button
                                onClick={() => setIsInviteOpen(false)}
                                className="px-4 py-1.5 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 font-semibold cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

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

            <ExportItineraryModal
                isOpen={isExportOpen}
                onClose={() => setIsExportOpen(false)}
            />
        </>
    );
}
