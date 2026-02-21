"use client";

import { TripProvider } from "@/lib/contexts/TripContext";
import { TripSidebar } from "@/components/layout/TripSidebar";

export function TripLayoutClient({ tripId, children }: { tripId: string; children: React.ReactNode }) {
    return (
        <TripProvider tripId={tripId}>
            <div className="flex flex-1 overflow-hidden h-[calc(100vh-72px)]">
                <TripSidebar />
                {children}
            </div>
        </TripProvider>
    );
}
