"use client";

import { useState } from "react";
import Link from "next/link";
import axios from "axios";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function SetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSetPassword = async (e) => {
    e.preventDefault();

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const token = localStorage.getItem("drive_app_token");

      if (!token) {
        setMessage("Google verification token missing. Please verify again.");
        return;
      }

      await axios.post(
        `${BACKEND_URL}/api/auth/set-password`,
        {
          password,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      localStorage.removeItem("drive_app_token");
      localStorage.removeItem("drive_app_user");

      setMessage("Password updated successfully. Redirecting to login...");

      setTimeout(() => {
        window.location.href = "/login";
      }, 1200);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0B1020] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Link href="/login" className="text-white/60 hover:text-white">
            ← Back to login
          </Link>
        </div>

        <div className="bg-white/10 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-blue-500 flex items-center justify-center text-2xl font-bold">
              D
            </div>

            <h1 className="text-3xl font-bold">Set Password</h1>

            <p className="text-white/60 mt-2">
              Create or reset your email login password.
            </p>
          </div>

          <form onSubmit={handleSetPassword} className="space-y-4">
            <div>
              <label className="block text-sm text-white/70 mb-2">
                New Password
              </label>
              <input
                type="password"
                className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 outline-none focus:border-blue-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 outline-none focus:border-blue-500"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 py-3 font-semibold hover:bg-blue-700 transition disabled:opacity-60"
            >
              {loading ? "Saving..." : "Save Password"}
            </button>
          </form>

          {message && (
            <div className="mt-5 rounded-xl bg-black/30 border border-white/10 p-3 text-sm text-white/80">
              {message}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}