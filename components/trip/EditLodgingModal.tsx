"use client";

import { useState, useEffect } from "react";
import { Place } from "@/lib/types";
import { X, Calendar, AlignLeft } from "lucide-react";

interface EditLodgingModalProps {
    isOpen: boolean;
    onClose: (refresh?: boolean) => void;
    tripId: string;
    place: Place;
    currentCheckIn?: string;
    currentCheckOut?: string;
}

export function EditLodgingModal({ isOpen, onClose, tripId, place, currentCheckIn, currentCheckOut }: EditLodgingModalProps) {
    const [checkIn, setCheckIn] = useState(currentCheckIn || "");
    const [checkOut, setCheckOut] = useState(currentCheckOut || "");
    const [notes, setNotes] = useState(place.notes || "");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setCheckIn(currentCheckIn || "");
        setCheckOut(currentCheckOut || "");
        setNotes(place.notes || "");
    }, [currentCheckIn, currentCheckOut, place]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch(`/api/trips/${tripId}/lodging`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    placeId: place.id,
                    checkIn,
                    checkOut,
                    notes
                })
            });

            if (res.ok) {
                onClose(true);
            } else {
                alert("Failed to update lodging");
            }
        } catch (error) {
            console.error(error);
            alert("Error updating lodging");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-surface w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-accent animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b border-accent flex justify-between items-center bg-background/50">
                    <h3 className="font-display font-bold text-lg text-text">Edit Lodging Dates</h3>
                    <button onClick={() => onClose(false)} className="text-muted hover:text-text transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-lg bg-gray-200 overflow-hidden shrink-0">
                            {place.image && <img src={place.image} className="w-full h-full object-cover" alt={place.name} />}
                        </div>
                        <div>
                            <h4 className="font-bold text-text mb-1">{place.name}</h4>
                            <span className="text-xs text-muted uppercase tracking-wider">{place.type}</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">Check-In</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                                    <input
                                        type="date"
                                        value={checkIn ? checkIn.split('T')[0] : ''}
                                        onChange={(e) => setCheckIn(e.target.value)}
                                        className="w-full bg-background border border-accent rounded-xl py-2 pl-10 pr-4 text-text focus:outline-none focus:border-primary transition-colors"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">Check-Out</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                                    <input
                                        type="date"
                                        value={checkOut ? checkOut.split('T')[0] : ''}
                                        onChange={(e) => setCheckOut(e.target.value)}
                                        className="w-full bg-background border border-accent rounded-xl py-2 pl-10 pr-4 text-text focus:outline-none focus:border-primary transition-colors"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">Notes</label>
                            <div className="relative">
                                <AlignLeft className="absolute left-3 top-3 text-muted" size={16} />
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full bg-background border border-accent rounded-xl py-2 pl-10 pr-4 text-text focus:outline-none focus:border-primary transition-colors min-h-[100px] resize-none"
                                    placeholder="Add notes about your stay..."
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
                            >
                                {loading ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
