"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";
import { FiCheckCircle, FiXCircle } from "react-icons/fi";

type ToastItem = { id: number; msg: string; ok: boolean };
type ToastCtx = { success: (msg: string) => void; error: (msg: string) => void };

const ToastContext = createContext<ToastCtx>({ success: () => {}, error: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const add = useCallback((msg: string, ok: boolean) => {
    const id = ++counter.current;
    setToasts((p) => [...p, { id, msg, ok }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3000);
  }, []);

  const value: ToastCtx = {
    success: (msg) => add(msg, true),
    error: (msg) => add(msg, false),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-[10px] shadow-lg text-[13px] font-medium text-white pointer-events-auto max-w-[320px] ${
              t.ok ? "bg-[#0F6E56]" : "bg-[#E24B4A]"
            }`}
          >
            {t.ok ? <FiCheckCircle size={15} className="shrink-0" /> : <FiXCircle size={15} className="shrink-0" />}
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
