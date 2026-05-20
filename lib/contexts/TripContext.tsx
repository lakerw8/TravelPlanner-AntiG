"use client";

import type { Dispatch, SetStateAction } from "react";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Trip, Place, PlaceList } from "@/lib/types";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export interface Collaborator {
    presenceGuid: string;
    user_id: string | null;
    nickname: string;
    color: string;
}

interface TripContextValue {
    trip: Trip | null;
    isLoading: boolean;
    error: string | null;
    lists: PlaceList[];
    refreshTrip: () => Promise<void>;
    updateTripLocally: (updater: (trip: Trip) => Trip) => void;
    // Map state shared between sidebar and map
    mapCenter: [number, number] | undefined;
    setMapCenter: (center: [number, number]) => void;
    selectedPlace: Place | null;
    setSelectedPlace: Dispatch<SetStateAction<Place | null>>;
    activeDayIndex: number | null;
    setActiveDayIndex: (index: number | null) => void;
    // Collaboration features
    nickname: string | null;
    setNickname: (name: string) => void;
    collaborators: Collaborator[];
}

export const TripContext = createContext<TripContextValue | null>(null);

const AVATAR_COLORS = ["#D4AF37", "#8A9A5B", "#4682B4", "#704214", "#9E7BFF", "#E68A8A"];
function getColorForNickname(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % AVATAR_COLORS.length;
    return AVATAR_COLORS[index];
}

export function TripProvider({ tripId, children }: { tripId: string; children: ReactNode }) {
    const [trip, setTrip] = useState<Trip | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lists, setLists] = useState<PlaceList[]>([]);
    const [mapCenter, setMapCenter] = useState<[number, number] | undefined>(undefined);
    const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
    const [activeDayIndex, setActiveDayIndex] = useState<number | null>(0);

    // Collaboration & Multiplayer State
    const [nickname, setNicknameState] = useState<string | null>(null);
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(false);
    const [nicknameInput, setNicknameInput] = useState("");
    const [currentUser, setCurrentUser] = useState<any>(null);

    const refreshTrip = useCallback(async () => {
        try {
            const res = await fetch(`/api/trips/${tripId}`);
            if (!res.ok) throw new Error("Failed to fetch trip");
            const tripData: Trip = await res.json();
            setTrip(tripData);
            setLists(tripData.lists || []);
            setError(null);
            if (tripData.lat && tripData.lng) {
                setMapCenter((current) => current ?? [tripData.lat!, tripData.lng!]);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load trip");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [tripId]);

    // Handle initial loading & user resolution
    useEffect(() => {
        setIsLoading(true);
        void refreshTrip();

        const supabase = getSupabaseBrowserClient();
        supabase.auth.getUser().then(({ data }) => {
            if (data?.user) {
                setCurrentUser(data.user);
                const defaultName = data.user.email?.split("@")[0] || "User";
                setNicknameState(defaultName);
            } else {
                const stored = localStorage.getItem("trip-nickname");
                if (stored) {
                    setNicknameState(stored);
                } else {
                    setIsNicknameModalOpen(true);
                }
            }
        });
    }, [refreshTrip]);

    // Set custom nickname
    const setNickname = useCallback((name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        localStorage.setItem("trip-nickname", trimmed);
        setNicknameState(trimmed);
        setIsNicknameModalOpen(false);
    }, []);

    // Database changes subscription
    useEffect(() => {
        if (!tripId) return;

        const supabase = getSupabaseBrowserClient();
        const dbChannel = supabase.channel(`trip:db:${tripId}`);

        dbChannel
            .on("postgres_changes", { event: "*", schema: "public", table: "trips", filter: `id=eq.${tripId}` }, () => { void refreshTrip(); })
            .on("postgres_changes", { event: "*", schema: "public", table: "itinerary_items", filter: `trip_id=eq.${tripId}` }, () => { void refreshTrip(); })
            .on("postgres_changes", { event: "*", schema: "public", table: "flights", filter: `trip_id=eq.${tripId}` }, () => { void refreshTrip(); })
            .on("postgres_changes", { event: "*", schema: "public", table: "lodgings", filter: `trip_id=eq.${tripId}` }, () => { void refreshTrip(); })
            .on("postgres_changes", { event: "*", schema: "public", table: "lists", filter: `trip_id=eq.${tripId}` }, () => { void refreshTrip(); })
            .on("postgres_changes", { event: "*", schema: "public", table: "list_items" }, () => { void refreshTrip(); })
            .subscribe();

        return () => {
            void dbChannel.unsubscribe();
        };
    }, [tripId, refreshTrip]);

    // Presence Channel subscription
    useEffect(() => {
        if (!tripId || !nickname) return;

        const supabase = getSupabaseBrowserClient();
        const presenceChannel = supabase.channel(`trip:presence:${tripId}`, {
            config: {
                presence: {
                    key: nickname,
                },
            },
        });

        const userColor = getColorForNickname(nickname);

        presenceChannel
            .on("presence", { event: "sync" }, () => {
                const state = presenceChannel.presenceState();
                const list: Collaborator[] = [];
                Object.keys(state).forEach((key) => {
                    const presences = state[key] as any[];
                    presences.forEach((p) => {
                        list.push({
                            presenceGuid: p.presenceGuid || key,
                            user_id: p.user_id || null,
                            nickname: p.nickname || key,
                            color: p.color || "#D4AF37",
                        });
                    });
                });
                setCollaborators(list);
            })
            .subscribe(async (status) => {
                if (status === "SUBSCRIBED") {
                    await presenceChannel.track({
                        presenceGuid: Math.random().toString(36).substring(7),
                        user_id: currentUser?.id || null,
                        nickname: nickname,
                        color: userColor,
                        onlineAt: new Date().toISOString(),
                    });
                }
            });

        return () => {
            void presenceChannel.unsubscribe();
        };
    }, [tripId, nickname, currentUser]);

    const updateTripLocally = useCallback((updater: (trip: Trip) => Trip) => {
        setTrip((current) => {
            if (!current) return current;
            const updated = updater(current);
            setLists(updated.lists || []);
            return updated;
        });
    }, []);

    const handleNicknameSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setNickname(nicknameInput);
    };

    return (
        <TripContext.Provider value={{
            trip,
            isLoading,
            error,
            lists,
            refreshTrip,
            updateTripLocally,
            mapCenter,
            setMapCenter,
            selectedPlace,
            setSelectedPlace,
            activeDayIndex,
            setActiveDayIndex,
            nickname,
            setNickname,
            collaborators,
        }}>
            {children}

            {/* Nickname overlay modal */}
            {isNicknameModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300">
                    <div className="w-full max-w-md p-8 bg-white/95 dark:bg-zinc-900/95 border border-amber-500/20 rounded-2xl shadow-2xl backdrop-blur-xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-serif text-amber-500 font-bold mb-2 tracking-wide">
                                Welcome to Wanderlust
                            </h2>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-sans">
                                Plan your luxury group vacation in real-time. Enter your nickname to join the collaboration room.
                            </p>
                        </div>

                        <form onSubmit={handleNicknameSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider mb-2">
                                    Your Nickname
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={nicknameInput}
                                    onChange={(e) => setNicknameInput(e.target.value)}
                                    placeholder="Enter nickname..."
                                    maxLength={25}
                                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white font-semibold rounded-xl tracking-wide shadow-lg hover:shadow-amber-500/10 active:scale-[0.98] transition-all duration-150 cursor-pointer"
                            >
                                Enter Planning Room
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </TripContext.Provider>
    );
}

export function useTripContext(): TripContextValue {
    const ctx = useContext(TripContext);
    if (!ctx) throw new Error("useTripContext must be used within TripProvider");
    return ctx;
}
