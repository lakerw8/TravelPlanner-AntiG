"use client";

import { X, BedDouble, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Lodging, Place } from "@/lib/types";
import { formatDateOnly } from "@/lib/date";
import { PlaceAutocomplete } from "./PlaceAutocomplete";
import { EditLodgingModal } from "./EditLodgingModal";

export interface ManagedLodging {
    id: string;
    place: Place;
}

interface AddLodgingModalProps {
    isOpen: boolean;
    onClose: () => void;
    tripId: string;
    lodgings: ManagedLodging[];
    onRefresh?: () => void;
}

export function AddLodgingModal({ isOpen, onClose, tripId, lodgings, onRefresh }: AddLodgingModalProps) {
    const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
    const [checkIn, setCheckIn] = useState("");
    const [checkOut, setCheckOut] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [deletingLodgingId, setDeletingLodgingId] = useState<string | null>(null);
    const [editingLodging, setEditingLodging] = useState<ManagedLodging | null>(null);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!selectedPlace) return;

        setIsSaving(true);
        const lodgingData: Partial<Lodging> = {
            ...selectedPlace,
            type: "lodging",
            checkIn,
            checkOut,
        };

        try {
            const res = await fetch(`/api/trips/${tripId}/lodging`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(lodgingData),
            });

            if (!res.ok) {
                throw new Error("Failed to save lodging");
            }

            setSelectedPlace(null);
            setCheckIn("");
            setCheckOut("");
            onRefresh?.();
        } catch (error) {
            console.error("Failed to save lodging", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteLodging = async (lodgingId: string, name: string) => {
        if (!confirm(`Delete ${name} from lodging?`)) return;

        setDeletingLodgingId(lodgingId);
        try {
            const res = await fetch(`/api/trips/${tripId}/lodging/${lodgingId}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                throw new Error("Failed to delete lodging");
            }

            onRefresh?.();
        } catch (error) {
            console.error("Failed to delete lodging", error);
        } finally {
            setDeletingLodgingId(null);
        }
    };

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-surface w-[640px] max-h-[85vh] rounded-2xl shadow-2xl border border-accent overflow-hidden animate-in fade-in zoom-in-95 flex flex-col">
                    <div className="p-4 border-b border-accent flex justify-between items-center bg-accent/10">
                        <h3 className="font-display text-lg font-bold text-text flex items-center gap-2">
                            <BedDouble size={20} /> Lodging
                        </h3>
                        <button onClick={onClose} className="text-muted hover:text-text transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-muted mb-2 block">Search for Hotel</label>
                            <PlaceAutocomplete
                                onSelect={setSelectedPlace}
                                placeholder="Search for a hotel..."
                            />
                        </div>

                        {selectedPlace && (
                            <div className="bg-accent/10 rounded-xl p-4 border border-accent">
                                <h4 className="font-bold text-text">{selectedPlace.name}</h4>
                                <p className="text-sm text-muted">{selectedPlace.address}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest text-muted mb-1 block">Check In</label>
                                <input
                                    type="date"
                                    value={checkIn}
                                    onChange={(e) => setCheckIn(e.target.value)}
                                    className="w-full px-3 py-2 bg-surface border border-accent rounded-lg text-text focus:border-primary focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase tracking-widest text-muted mb-1 block">Check Out</label>
                                <input
                                    type="date"
                                    value={checkOut}
                                    onChange={(e) => setCheckOut(e.target.value)}
                                    className="w-full px-3 py-2 bg-surface border border-accent rounded-lg text-text focus:border-primary focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="border-t border-accent pt-5">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-display font-bold text-base text-text">Added Lodging</h4>
                                <span className="text-xs text-muted">{lodgings.length} total</span>
                            </div>

                            {lodgings.length === 0 ? (
                                <div className="text-sm text-muted italic">No lodging added yet.</div>
                            ) : (
                                <div className="space-y-3">
                                    {lodgings.map((lodging) => (
                                        <div
                                            key={lodging.id}
                                            className="rounded-xl border border-accent bg-background/60 p-3 flex items-start justify-between gap-3"
                                        >
                                            <div className="min-w-0">
                                                <div className="font-bold text-sm text-text truncate">{lodging.place.name}</div>
                                                <div className="text-xs text-muted truncate">{lodging.place.address || "No address"}</div>
                                                <div className="text-xs text-muted mt-1">
                                                    {formatDateOnly(lodging.place.checkIn)} - {formatDateOnly(lodging.place.checkOut)}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingLodging(lodging)}
                                                    className="h-8 w-8 rounded-lg border border-accent text-muted hover:text-primary hover:border-primary/50 flex items-center justify-center"
                                                    title={`Edit ${lodging.place.name}`}
                                                    aria-label={`Edit ${lodging.place.name}`}
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteLodging(lodging.id, lodging.place.name)}
                                                    disabled={deletingLodgingId === lodging.id}
                                                    className="h-8 w-8 rounded-lg border border-red-200 text-red-500 hover:text-red-600 hover:border-red-300 flex items-center justify-center disabled:opacity-50"
                                                    title={`Delete ${lodging.place.name}`}
                                                    aria-label={`Delete ${lodging.place.name}`}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-4 border-t border-accent bg-accent/5 flex justify-end gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-muted hover:text-text transition-colors">Close</button>
                        <button
                            onClick={handleSave}
                            disabled={!selectedPlace || !checkIn || !checkOut || isSaving}
                            className="px-6 py-2 bg-primary text-white text-sm font-bold rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                        >
                            {isSaving ? "Saving..." : "Add Lodging"}
                        </button>
                    </div>
                </div>
            </div>

            {editingLodging && (
                <EditLodgingModal
                    isOpen={!!editingLodging}
                    onClose={(refresh) => {
                        setEditingLodging(null);
                        if (refresh) {
                            onRefresh?.();
                        }
                    }}
                    tripId={tripId}
                    place={editingLodging.place}
                    currentCheckIn={editingLodging.place.checkIn}
                    currentCheckOut={editingLodging.place.checkOut}
                />
            )}
        </>
    );
}
