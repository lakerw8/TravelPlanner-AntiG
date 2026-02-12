import { TripSidebar } from "@/components/layout/TripSidebar";

export default function TripLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="flex flex-1 overflow-hidden h-[calc(100vh-72px)]">
            <TripSidebar />
            {children}
        </div>
    );
}
