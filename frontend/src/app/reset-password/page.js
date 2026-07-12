"use client";

import Link from "next/link";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function ResetPasswordPage() {
  const handleGoogleReset = () => {
    window.location.href = `${BACKEND_URL}/api/auth/google?mode=reset`;
  };

  return (
    <main className="min-h-screen bg-[#0B1020] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Link href="/login" className="text-white/60 hover:text-white">
            ← Back to login
          </Link>
        </div>

        <div className="bg-white/10 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur text-center">
          <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-blue-500 flex items-center justify-center text-2xl font-bold">
            D
          </div>

          <h1 className="text-3xl font-bold">Reset Password</h1>

          <p className="text-white/60 mt-4">
            To reset your password, verify your Google account first. After
            verification, you can set a new password safely.
          </p>

          <button
            onClick={handleGoogleReset}
            className="w-full rounded-xl bg-white text-black py-3 font-semibold hover:bg-gray-100 transition mt-8"
          >
            Continue with Google
          </button>
        </div>
      </div>
    </main>
  );
}