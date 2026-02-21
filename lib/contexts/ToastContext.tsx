"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Toast, type ToastData } from "@/components/ui/Toast";

interface ToastContextValue {
    toast: (options: { type?: "success" | "error" | "info"; message: string }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastData[]>([]);

    const toast = useCallback(({ type = "info", message }: { type?: "success" | "error" | "info"; message: string }) => {
        const id = String(++toastId);
        setToasts((prev) => [...prev, { id, type, message }]);
    }, []);

    const dismiss = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <ToastContext value={{ toast }}>
            {children}
            <Toast toasts={toasts} onDismiss={dismiss} />
        </ToastContext>
    );
}

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within ToastProvider");
    return ctx;
}
