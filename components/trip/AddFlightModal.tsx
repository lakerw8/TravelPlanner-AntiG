"use client";

import { X, Plane } from "lucide-react";
import { useState } from "react";
import { Flight } from "@/lib/types";

interface AddFlightModalProps {
    isOpen: boolean;
    onClose: () => void;
    tripId: string;
}

export function AddFlightModal({ isOpen, onClose, tripId }: AddFlightModalProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState<Partial<Flight>>({
        departureTime: "",
        arrivalTime: "",
        airline: "",
        flightNumber: "",
        departureAirport: "",
        arrivalAirport: "",
    });

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await fetch(`/api/trips/${tripId}/flights`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            onClose();
        } catch (error) {
            console.error("Failed to save flight", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-surface w-[500px] rounded-2xl shadow-2xl border border-accent overflow-hidden animate-in fade-in zoom-in-95">
                <div className="p-4 border-b border-accent flex justify-between items-center bg-accent/10">
                    <h3 className="font-display text-lg font-bold text-text flex items-center gap-2">
                        <Plane size={20} /> Add Flight
                    </h3>
                    <button onClick={onClose} className="text-muted hover:text-text transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-muted mb-1 block">Airline</label>
                            <input
                                name="airline"
                                value={formData.airline}
                                onChange={handleChange}
                                placeholder="e.g. ANA"
                                className="w-full px-3 py-2 bg-surface border border-accent rounded-lg text-text focus:border-primary focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-muted mb-1 block">Flight No.</label>
                            <input
                                name="flightNumber"
                                value={formData.flightNumber}
                                onChange={handleChange}
                                placeholder="e.g. NH106"
                                className="w-full px-3 py-2 bg-surface border border-accent rounded-lg text-text focus:border-primary focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-muted mb-1 block">Departure Airport</label>
                            <input
                                name="departureAirport"
                                value={formData.departureAirport}
                                onChange={handleChange}
                                placeholder="e.g. LAX"
                                className="w-full px-3 py-2 bg-surface border border-accent rounded-lg text-text focus:border-primary focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-muted mb-1 block">Arrival Airport</label>
                            <input
                                name="arrivalAirport"
                                value={formData.arrivalAirport}
                                onChange={handleChange}
                                placeholder="e.g. HND"
                                className="w-full px-3 py-2 bg-surface border border-accent rounded-lg text-text focus:border-primary focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-muted mb-1 block">Departure Time</label>
                            <input
                                type="datetime-local"
                                name="departureTime"
                                value={formData.departureTime}
                                onChange={handleChange}
                                className="w-full px-3 py-2 bg-surface border border-accent rounded-lg text-text focus:border-primary focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase tracking-widest text-muted mb-1 block">Arrival Time</label>
                            <input
                                type="datetime-local"
                                name="arrivalTime"
                                value={formData.arrivalTime}
                                onChange={handleChange}
                                className="w-full px-3 py-2 bg-surface border border-accent rounded-lg text-text focus:border-primary focus:outline-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-accent bg-accent/5 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-muted hover:text-text transition-colors">Cancel</button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !formData.airline || !formData.flightNumber}
                        className="px-6 py-2 bg-primary text-white text-sm font-bold rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                    >
                        {isSaving ? "Saving..." : "Add Flight"}
                    </button>
                </div>
            </div>
        </div>
    );
}
