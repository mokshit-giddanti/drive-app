"use client";

import { Menu, RefreshCw } from "lucide-react";

export default function Topbar({ title, subtitle, onMenuClick, onRefresh, loading }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#07111f]/85 backdrop-blur">
      <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden h-11 w-11 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center"
          >
            <Menu size={21} />
          </button>

          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{title}</h1>
            {subtitle && (
              <p className="text-white/45 text-sm hidden sm:block">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="h-11 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 flex items-center gap-2 text-sm font-semibold disabled:opacity-60"
          >
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        )}
      </div>
    </header>
  );
}