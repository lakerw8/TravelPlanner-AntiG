import { TripLayoutClient } from "./TripLayoutClient";

export default async function TripLayout({
    children,
    params,
}: Readonly<{
    children: React.ReactNode;
    params: Promise<{ id: string }>;
}>) {
    const { id } = await params;
    return <TripLayoutClient tripId={id}>{children}</TripLayoutClient>;
}
