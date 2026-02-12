import { TopNav } from "@/components/layout/TopNav";

export default function MainLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="flex flex-col h-full bg-background">
            <TopNav />
            {children}
        </div>
    );
}
