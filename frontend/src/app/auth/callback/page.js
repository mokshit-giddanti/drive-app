"use client";

import { useEffect, useState } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("Completing login...");

  useEffect(() => {
    const completeAuth = async () => {
      try {
        const params = new URLSearchParams(window.location.search);

        const token = params.get("token");
        const next = params.get("next") || "/dashboard";

        if (!token) {
          setMessage("Login token missing. Please login again.");
          return;
        }

        localStorage.setItem("drive_app_token", token);

        const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.message || "Failed to load user");
        }

        localStorage.setItem("drive_app_user", JSON.stringify(data.user));

        window.history.replaceState({}, document.title, "/auth/callback");

        window.location.href = next;
      } catch (error) {
        setMessage(error.message || "Authentication failed.");
      }
    };

    completeAuth();
  }, []);

  return (
    <main className="min-h-screen bg-[#0B1020] text-white flex items-center justify-center px-6">
      <div className="rounded-3xl bg-white/10 border border-white/10 p-8 text-center max-w-md">
        <div className="mx-auto mb-5 h-14 w-14 rounded-2xl bg-blue-500 flex items-center justify-center font-bold text-2xl">
          D
        </div>

        <h1 className="text-2xl font-bold mb-3">Drive Vault</h1>
        <p className="text-white/70">{message}</p>
      </div>
    </main>
  );
}