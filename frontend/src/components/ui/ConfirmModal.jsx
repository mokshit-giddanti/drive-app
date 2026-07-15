"use client";

import { AlertTriangle, Loader2, X } from "lucide-react";

export default function ConfirmModal({
  open,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  loading = false,
  danger = false,
  onConfirm,
  onClose,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center px-5">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={loading ? undefined : onClose}
      />

      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#111b2a] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div
            className={`h-12 w-12 rounded-2xl border flex items-center justify-center ${
              danger
                ? "bg-red-500/10 border-red-400/20 text-red-200"
                : "bg-blue-500/10 border-blue-400/20 text-blue-200"
            }`}
          >
            <AlertTriangle size={24} />
          </div>

          <button
            onClick={onClose}
            disabled={loading}
            className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center disabled:opacity-60"
          >
            <X size={19} />
          </button>
        </div>

        <h2 className="text-2xl font-bold">{title}</h2>

        {message && (
          <p className="text-white/55 mt-3 leading-7">{message}</p>
        )}

        <div className="grid grid-cols-2 gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-white/10 px-5 py-3 font-bold hover:bg-white/10 disabled:opacity-60"
          >
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-xl px-5 py-3 font-bold disabled:opacity-60 flex items-center justify-center gap-2 ${
              danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}