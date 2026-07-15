"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const showToast = ({ title, message = "", type = "info" }) => {
    const id = `${Date.now()}-${Math.random()}`;

    const toast = {
      id,
      title,
      message,
      type,
    };

    setToasts((prev) => [toast, ...prev]);

    setTimeout(() => {
      removeToast(id);
    }, 3500);
  };

  const value = useMemo(
    () => ({
      success: (title, message) =>
        showToast({
          title,
          message,
          type: "success",
        }),
      error: (title, message) =>
        showToast({
          title,
          message,
          type: "error",
        }),
      info: (title, message) =>
        showToast({
          title,
          message,
          type: "info",
        }),
    }),
    []
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="fixed bottom-5 right-5 z-[9999] w-[calc(100%-2.5rem)] max-w-sm space-y-3">
        {toasts.map((toast) => (
          <ToastCard
            key={toast.id}
            toast={toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}

function ToastCard({ toast, onClose }) {
  const isSuccess = toast.type === "success";
  const isError = toast.type === "error";

  const Icon = isSuccess ? CheckCircle2 : isError ? XCircle : Info;

  const toneClass = isSuccess
    ? "border-green-400/20 bg-green-500/10 text-green-200"
    : isError
    ? "border-red-400/20 bg-red-500/10 text-red-200"
    : "border-blue-400/20 bg-blue-500/10 text-blue-200";

  const iconClass = isSuccess
    ? "text-green-300"
    : isError
    ? "text-red-300"
    : "text-blue-300";

  return (
    <div
      className={`rounded-2xl border ${toneClass} shadow-2xl backdrop-blur px-4 py-3`}
    >
      <div className="flex items-start gap-3">
        <Icon size={21} className={`mt-0.5 shrink-0 ${iconClass}`} />

        <div className="min-w-0 flex-1">
          <p className="font-bold">{toast.title}</p>

          {toast.message && (
            <p className="text-white/60 text-sm mt-1 leading-5">
              {toast.message}
            </p>
          )}
        </div>

        <button
          onClick={onClose}
          className="h-7 w-7 rounded-lg hover:bg-white/10 flex items-center justify-center"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}