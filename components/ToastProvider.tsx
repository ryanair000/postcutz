"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

type ToastVariant = "success" | "error" | "info";

type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
};

type ToastItem = ToastInput & {
  id: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  toast: (input: ToastInput) => string;
  dismissToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, number>());

  const dismissToast = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((input: ToastInput) => {
    const id = makeId();
    const item: ToastItem = {
      ...input,
      id,
      variant: input.variant || "info"
    };
    setItems((current) => [...current.slice(-3), item]);
    const timer = window.setTimeout(() => dismissToast(id), input.duration ?? 5200);
    timers.current.set(id, timer);
    return id;
  }, [dismissToast]);

  useEffect(() => () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current.clear();
  }, []);

  const value = useMemo(() => ({ toast, dismissToast }), [toast, dismissToast]);

  return <ToastContext.Provider value={value}>
    {children}
    <div className="toast-viewport" aria-live="polite" aria-atomic="false">
      {items.map((item) => {
        const Icon = item.variant === "success" ? CheckCircle2 : item.variant === "error" ? AlertCircle : Info;
        return <article
          className={`app-toast ${item.variant}`}
          key={item.id}
          role={item.variant === "error" ? "alert" : "status"}
        >
          <Icon className="app-toast-icon" size={20} aria-hidden="true" />
          <div className="app-toast-copy">
            <strong>{item.title}</strong>
            {item.description && <p>{item.description}</p>}
          </div>
          <button type="button" onClick={() => dismissToast(item.id)} aria-label="Dismiss notification">
            <X size={17} />
          </button>
        </article>;
      })}
    </div>
  </ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider.");
  return context;
}
