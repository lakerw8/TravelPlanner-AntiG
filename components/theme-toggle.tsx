"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    return (
        <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="p-2 rounded-full hover:bg-accent transition-colors"
            aria-label="Toggle theme"
        >
            <Sun className="h-5 w-5 scale-100 dark:scale-0 transition-all absolute rotate-0 dark:-rotate-90" />
            <Moon className="h-5 w-5 scale-0 dark:scale-100 transition-all rotate-90 dark:rotate-0" />
            <span className="sr-only">Toggle theme</span>
        </button>
    );
}
