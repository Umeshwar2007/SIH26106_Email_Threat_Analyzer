"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toast: (opts: Omit<ToastItem, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback(({ type, title, description }: Omit<ToastItem, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, description }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 p-3.5 bg-ink text-paper rounded border border-border-dark shadow-elevated transition-all animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            <div className="mt-0.5 shrink-0">
              {t.type === "success" && <span className="inline-block w-2 h-2 rounded-full bg-threat-green" />}
              {t.type === "error" && <span className="inline-block w-2 h-2 rounded-full bg-threat-red" />}
              {t.type === "warning" && <span className="inline-block w-2 h-2 rounded-full bg-threat-amber" />}
              {t.type === "info" && <span className="inline-block w-2 h-2 rounded-full bg-paper" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold tracking-wide text-paper">{t.title}</div>
              {t.description && (
                <div className="mt-0.5 text-[11px] text-forensic-muted leading-relaxed font-normal">
                  {t.description}
                </div>
              )}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-forensic-dim hover:text-paper p-0.5 transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
