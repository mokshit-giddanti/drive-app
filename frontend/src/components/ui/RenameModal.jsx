"use client";

import { Loader2, Pencil, X } from "lucide-react";
import { useEffect, useState } from "react";

export default function RenameModal({
  open,
  title = "Rename item",
  initialValue = "",
  loading = false,
  onClose,
  onSubmit,
}) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) {
      setValue(initialValue || "");
    }
  }, [open, initialValue]);

  if (!open) return null;

  const handleSubmit = (event) => {
    event.preventDefault();

    const trimmedValue = value.trim();

    if (!trimmedValue || trimmedValue === initialValue) return;

    onSubmit(trimmedValue);
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center px-5">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={loading ? undefined : onClose}
      />

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#111b2a] p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="h-12 w-12 rounded-2xl border bg-blue-500/10 border-blue-400/20 text-blue-200 flex items-center justify-center">
            <Pencil size={23} />
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center disabled:opacity-60"
          >
            <X size={19} />
          </button>
        </div>

        <h2 className="text-2xl font-bold">{title}</h2>

        <p className="text-white/50 mt-2">
          Enter a new name for this item.
        </p>

        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          autoFocus
          className="mt-5 w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 outline-none focus:border-blue-500"
          placeholder="New name"
        />

        <div className="grid grid-cols-2 gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-white/10 px-5 py-3 font-bold hover:bg-white/10 disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading || !value.trim() || value.trim() === initialValue}
            className="rounded-xl bg-blue-600 px-5 py-3 font-bold hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            Rename
          </button>
        </div>
      </form>
    </div>
  );
}