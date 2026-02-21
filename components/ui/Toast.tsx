"use client";

import { useEffect, useRef } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

export interface ToastData {
    id: string;
    type: "success" | "error" | "info";
    message: string;
}

const ICONS = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
};

const COLORS = {
    success: "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-200",
    error: "bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200",
    info: "bg-sky-50 border-sky-200 text-sky-800 dark:bg-sky-950 dark:border-sky-800 dark:text-sky-200",
};

const ICON_COLORS = {
    success: "text-emerald-500",
    error: "text-red-500",
    info: "text-sky-500",
};

function ToastItem({ toast, onDismiss }: { toast: ToastData; onDismiss: (id: string) => void }) {
    const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const Icon = ICONS[toast.type];
    const autoDismiss = toast.type !== "error" ? 3000 : 6000;

    useEffect(() => {
        timerRef.current = setTimeout(() => onDismiss(toast.id), autoDismiss);
        return () => clearTimeout(timerRef.current);
    }, [toast.id, onDismiss, autoDismiss]);

    return (
        <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm animate-in slide-in-from-right fade-in duration-200 max-w-sm ${COLORS[toast.type]}`}
            role="alert"
        >
            <Icon size={18} className={`shrink-0 ${ICON_COLORS[toast.type]}`} />
            <span className="text-sm font-medium flex-1">{toast.message}</span>
            <button
                onClick={() => onDismiss(toast.id)}
                className="shrink-0 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                aria-label="Dismiss"
            >
                <X size={14} />
            </button>
        </div>
    );
}

export function Toast({ toasts, onDismiss }: { toasts: ToastData[]; onDismiss: (id: string) => void }) {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
            {toasts.map((t) => (
                <div key={t.id} className="pointer-events-auto">
                    <ToastItem toast={t} onDismiss={onDismiss} />
                </div>
            ))}
        </div>
    );
}
