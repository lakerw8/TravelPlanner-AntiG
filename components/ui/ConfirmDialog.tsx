"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface ConfirmOptions {
    title: string;
    message: string;
    confirmLabel?: string;
    danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<(ConfirmOptions & { resolve: (value: boolean) => void }) | null>(null);
    const resolveRef = useRef<((value: boolean) => void) | null>(null);

    const confirm: ConfirmFn = useCallback((options) => {
        return new Promise<boolean>((resolve) => {
            resolveRef.current = resolve;
            setState({ ...options, resolve });
        });
    }, []);

    const handleClose = (value: boolean) => {
        resolveRef.current?.(value);
        resolveRef.current = null;
        setState(null);
    };

    return (
        <ConfirmContext value={confirm}>
            {children}
            {state && (
                <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm bg-surface rounded-2xl shadow-xl border border-accent p-6 animate-in zoom-in-95 fade-in duration-150">
                        <div className="flex items-start gap-3 mb-4">
                            {state.danger && (
                                <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30 shrink-0">
                                    <AlertTriangle size={20} className="text-red-500" />
                                </div>
                            )}
                            <div>
                                <h3 className="font-display font-bold text-lg text-text">{state.title}</h3>
                                <p className="text-sm text-muted mt-1">{state.message}</p>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => handleClose(false)}
                                className="px-4 py-2 text-sm font-medium rounded-lg border border-accent text-muted hover:text-text hover:bg-accent/20 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleClose(true)}
                                className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
                                    state.danger
                                        ? "bg-red-500 hover:bg-red-600 text-white"
                                        : "bg-primary hover:bg-primary-dark text-white"
                                }`}
                            >
                                {state.confirmLabel ?? "Confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext>
    );
}

export function useConfirm(): ConfirmFn {
    const ctx = useContext(ConfirmContext);
    if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
    return ctx;
}
