import { Menu } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/auth/SignOutButton";

export function TopNav() {
    return (
        <nav className="h-[72px] shrink-0 bg-surface border-b border-accent px-6 flex justify-between items-center z-50">
            <div className="flex items-center space-x-6">
                <Menu className="text-muted hover:text-primary cursor-pointer w-6 h-6" />
                <Link href="/" className="font-display text-2xl font-bold tracking-tight text-text">
                    Wanderlust
                </Link>
            </div>
            <div className="flex items-center space-x-6">
                <Link href="/dashboard" className="text-sm font-medium text-text hover:text-primary transition-colors">
                    My Trips
                </Link>
                <button className="text-sm font-medium text-text hover:text-primary transition-colors">
                    Explore
                </button>
                <SignOutButton />
                <ThemeToggle />
                <div className="h-8 w-8 rounded-full bg-accent overflow-hidden ring-2 ring-transparent hover:ring-primary transition-all cursor-pointer">
                    <div className="h-full w-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                        U
                    </div>
                </div>
            </div>
        </nav>
    );
}
