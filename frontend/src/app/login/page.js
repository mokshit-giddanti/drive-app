"use client";

import { useState } from "react";
import Link from "next/link";
import axios from "axios";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function LoginPage() {
  const [email, setEmail] = useState("backendusr@gmail.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handlePasswordLogin = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setMessage("");

      const response = await axios.post(`${BACKEND_URL}/api/auth/login`, {
        email,
        password,
      });

      const data = response.data;

      localStorage.setItem("drive_app_token", data.token);
      localStorage.setItem("drive_app_user", JSON.stringify(data.user));

      window.location.href = "/dashboard";
    } catch (error) {
      setMessage(error.response?.data?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${BACKEND_URL}/api/auth/google?mode=login`;
  };

  return (
    <main className="min-h-screen bg-[#0B1020] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Link href="/" className="text-white/60 hover:text-white">
            ← Back to home
          </Link>
        </div>

        <div className="bg-white/10 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-blue-500 flex items-center justify-center text-2xl font-bold">
              D
            </div>

            <h1 className="text-3xl font-bold">Login</h1>

            <p className="text-white/60 mt-2">
              Access your private Drive Vault.
            </p>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full rounded-xl bg-white text-black py-3 font-semibold hover:bg-gray-100 transition"
          >
            Continue with Google
          </button>

          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-white/40 text-sm">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-white/70 mb-2">Email</label>
              <input
                type="email"
                className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 outline-none focus:border-blue-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email"
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">
                Password
              </label>
              <input
                type="password"
                className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 outline-none focus:border-blue-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 py-3 font-semibold hover:bg-blue-700 transition disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <div className="mt-5 text-center">
            <Link
              href="/reset-password"
              className="text-sm text-blue-300 hover:text-blue-200"
            >
              Forgot password?
            </Link>
          </div>

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