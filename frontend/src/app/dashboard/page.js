"use client";

import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("drive_app_token");
    const savedUser = localStorage.getItem("drive_app_user");

    if (!token) {
      window.location.href = "/";
      return;
    }

    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("drive_app_token");
    localStorage.removeItem("drive_app_user");
    window.location.href = "/";
  };

  return (
    <main className="min-h-screen bg-[#0B1020] text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-white/60 mt-1">
              Welcome {user?.name || "User"}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-xl bg-red-500 px-5 py-2 font-semibold hover:bg-red-600 transition"
          >
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="rounded-2xl bg-white/10 border border-white/10 p-6">
            <h2 className="text-lg font-semibold">Files</h2>
            <p className="text-white/50 mt-2">File manager coming next.</p>
          </div>

          <div className="rounded-2xl bg-white/10 border border-white/10 p-6">
            <h2 className="text-lg font-semibold">Storage</h2>
            <p className="text-white/50 mt-2">Storage card coming next.</p>
          </div>

          <div className="rounded-2xl bg-white/10 border border-white/10 p-6">
            <h2 className="text-lg font-semibold">Logs</h2>
            <p className="text-white/50 mt-2">Activity logs coming next.</p>
          </div>
        </div>
      </div>
    </main>
  );
}