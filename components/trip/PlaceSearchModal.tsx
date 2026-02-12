"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { Place } from "@/lib/types";
import { PlaceAutocomplete } from "./PlaceAutocomplete";

interface PlaceSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    tripId: string;
}

export function PlaceSearchModal({ isOpen, onClose, tripId }: PlaceSearchModalProps) {
    const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!selectedPlace) return;

        setIsSaving(true);
        try {
            await fetch(`/api/trips/${tripId}/places`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(selectedPlace)
            });
            onClose();
        } catch (error) {
            console.error("Failed to save place", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-surface w-[500px] rounded-2xl shadow-2xl border border-accent overflow-hidden animate-in fade-in zoom-in-95">
                <div className="p-4 border-b border-accent flex justify-between items-center bg-accent/10">
                    <h3 className="font-display text-lg font-bold text-text">Add a Place</h3>
                    <button onClick={onClose} className="text-muted hover:text-text transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <div className="mb-6">
                        <label className="text-xs font-bold uppercase tracking-widest text-muted mb-2 block">Search for a place</label>
                        <PlaceAutocomplete
                            onSelect={setSelectedPlace}
                            placeholder="Search for a place..."
                        />
                    </div>

                    {selectedPlace && (
                        <div className="bg-accent/10 rounded-xl p-4 border border-accent animate-in fade-in slide-in-from-top-2">
                            <div className="flex gap-4">
                                <div className="w-16 h-16 bg-gray-200 rounded-lg shrink-0 overflow-hidden">
                                    {selectedPlace.image && <img src={selectedPlace.image} className="w-full h-full object-cover" alt="" />}
                                </div>
                                <div>
                                    <h4 className="font-bold text-text">{selectedPlace.name}</h4>
                                    <p className="text-sm text-muted">{selectedPlace.address}</p>
                                    <div className="flex gap-2 mt-1">
                                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-bold uppercase">{selectedPlace.type}</span>
                                        {selectedPlace.rating && <span className="text-[10px] bg-yellow-400/20 text-yellow-700 px-2 py-0.5 rounded font-bold">★ {selectedPlace.rating}</span>}
                                    </div>
                                    {selectedPlace.city === 'Tokyo' && (
                                        <span className="inline-block mt-2 text-[10px] bg-green-500/10 text-green-600 px-2 py-0.5 rounded font-bold">Recommended (Near Trip)</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-accent bg-accent/5 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-muted hover:text-text transition-colors">Cancel</button>
                    <button
                        onClick={handleSave}
                        disabled={!selectedPlace || isSaving}
                        className="px-6 py-2 bg-primary text-white text-sm font-bold rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                    >
                        {isSaving ? "Saving..." : "Add to Trip"}
                    </button>
                </div>
            </div>
        </div>
    );
}
