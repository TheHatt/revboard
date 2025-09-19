"use client";
import { createContext, useContext, useState } from "react";

type Toast = { id: number; title: string; description?: string };
const ToastCtx = createContext<{ push: (t: Omit<Toast,"id">) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  function push(t: Omit<Toast,"id">) {
    const id = Date.now();
    setToasts((s) => [...s, { id, ...t }]);
    setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 3000);
  }
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2">
        {toasts.map(t => (
          <div key={t.id} className="rounded-xl border bg-white px-3 py-2 shadow dark:border-neutral-800 dark:bg-neutral-950">
            <div className="text-sm font-medium">{t.title}</div>
            {t.description && <div className="text-xs text-neutral-500">{t.description}</div>}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
