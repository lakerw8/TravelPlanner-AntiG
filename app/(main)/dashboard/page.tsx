"use client";

import Link from "next/link";
import { Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { TripSummary } from "@/lib/types";
import { formatDateOnly } from "@/lib/date";

export default function DashboardPage() {
    const [trips, setTrips] = useState<TripSummary[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTripDate, setNewTripDate] = useState({ start: '', end: '' });
    const [newTripTitle, setNewTripTitle] = useState('');

    useEffect(() => {
        fetch('/api/trips')
            .then(res => res.json())
            .then(data => setTrips(Array.isArray(data) ? data : []));
    }, []);

    const handleCreateTrip = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch('/api/trips', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: newTripTitle,
                startDate: newTripDate.start,
                endDate: newTripDate.end
            })
        });
        const newTrip = await res.json();
        if (newTrip && !newTrip.error) {
            setTrips([...trips, newTrip]);
            setIsModalOpen(false);
            setNewTripTitle('');
            setNewTripDate({ start: '', end: '' });
        }
    };

    return (
        <main className="flex-1 container mx-auto px-6 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-display font-bold text-text">My Trips</h1>
                    <p className="text-muted mt-2">Manage your upcoming adventures.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors shadow-sm font-bold"
                >
                    <Plus size={18} />
                    Create New Trip
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trips.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-muted">
                        No trips found. Start by creating one!
                    </div>
                ) : (
                    trips.map(trip => (
                        <Link key={trip.id} href={`/trip/${trip.id}`} className="group block bg-surface rounded-xl overflow-hidden border border-accent shadow-sm hover:shadow-md transition-all">
                            <div className="h-48 bg-gray-200 relative">
                                {trip.coverImage ? (
                                    <img src={trip.coverImage} alt={trip.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-muted">No Image</div>
                                )}
                            </div>
                            <div className="p-5">
                                <h3 className="font-display text-xl font-bold text-text group-hover:text-primary transition-colors">{trip.title}</h3>
                                <p className="text-sm text-muted mt-1">
                                    {formatDateOnly(trip.startDate)} - {formatDateOnly(trip.endDate)}
                                </p>
                            </div>
                        </Link>
                    ))
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md bg-surface rounded-2xl shadow-xl border border-accent p-6 relative">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-muted hover:text-text">
                            <X size={20} />
                        </button>
                        <h2 className="text-xl font-display font-bold mb-4 text-text">Plan a New Adventure</h2>
                        <form onSubmit={handleCreateTrip} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-text mb-1">Trip Title</label>
                                <input
                                    type="text"
                                    value={newTripTitle}
                                    onChange={(e) => setNewTripTitle(e.target.value)}
                                    placeholder="e.g. Summer in Paris"
                                    className="w-full px-3 py-2 rounded-lg border border-accent bg-background focus:outline-none focus:border-primary"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-text mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        value={newTripDate.start}
                                        onChange={(e) => setNewTripDate({ ...newTripDate, start: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-accent bg-background focus:outline-none focus:border-primary"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-text mb-1">End Date</label>
                                    <input
                                        type="date"
                                        value={newTripDate.end}
                                        onChange={(e) => setNewTripDate({ ...newTripDate, end: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-accent bg-background focus:outline-none focus:border-primary"
                                        required
                                    />
                                </div>
                            </div>
                            <button type="submit" className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg transition-colors mt-2">
                                Create Trip
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
}
