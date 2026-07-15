"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Folder,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  RefreshCw,
  ShieldCheck,
  User,
} from "lucide-react";

import { useDashboard } from "@/components/dashboard/DashboardShell";

import {
  BACKEND_URL,
  apiClient,
  authHeaders,
  handleAuthError,
} from "@/lib/api";

export default function SettingsPage() {
  const { user } = useDashboard();

  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadAccount = useCallback(async ({ silent = false } = {}) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await apiClient.get("/api/auth/me", {
        headers: authHeaders(),
      });

      setAccount(response.data);
    } catch (error) {
      if (handleAuthError(error)) return;
      setError(error.response?.data?.message || "Failed to load settings.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  const profile = account?.user || user;
  const driveFolders = account?.driveFolders || {};
  const authProvider = account?.authProvider || "unknown";
  const hasPassword = Boolean(account?.hasPassword);

  const startPasswordReset = () => {
    window.location.href = `${BACKEND_URL}/api/auth/google?mode=reset`;
  };

  return (
    <>
      <section className="mb-6 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Account Settings</h2>
          <p className="text-white/45 mt-2">
            Manage your profile, login method, password, and vault connection.
          </p>
        </div>

        <button
          onClick={() => loadAccount({ silent: true })}
          disabled={loading || refreshing}
          className="rounded-xl border border-white/15 px-5 py-3 font-bold hover:bg-white/10 transition flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {refreshing || loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <RefreshCw size={18} />
          )}
          Refresh
        </button>
      </section>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingSettings />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.9fr] gap-5">
          <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 mb-6">
              <Avatar user={profile} />

              <div className="min-w-0">
                <p className="text-white/45 text-sm">Signed in as</p>
                <h3 className="text-2xl font-bold mt-1 truncate">
                  {profile?.name || "Drive Vault User"}
                </h3>

                <p className="text-white/50 mt-2 flex items-center gap-2 truncate">
                  <Mail size={16} />
                  {profile?.email || "No email available"}
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <InfoCard
                title="Google Account"
                value="Connected"
                subtitle="Used for Drive access"
                icon={ShieldCheck}
                tone="green"
              />

              <InfoCard
                title="Login Method"
                value={formatAuthProvider(authProvider)}
                subtitle="Current session provider"
                icon={User}
                tone="blue"
              />

              <InfoCard
                title="Password Login"
                value={hasPassword ? "Enabled" : "Not set"}
                subtitle={
                  hasPassword
                    ? "Email/password login is active"
                    : "Set password using Google verification"
                }
                icon={LockKeyhole}
                tone={hasPassword ? "green" : "yellow"}
              />

              <InfoCard
                title="Vault Status"
                value="Active"
                subtitle="Google Drive vault is linked"
                icon={Folder}
                tone="green"
              />
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 h-fit">
            <div className="h-12 w-12 rounded-2xl bg-blue-500/15 border border-blue-400/20 flex items-center justify-center text-blue-300 mb-4">
              <KeyRound size={24} />
            </div>

            <h3 className="text-xl font-bold">Password & Security</h3>

            <p className="text-white/50 mt-3 leading-7">
              Password changes are protected with Google verification. This
              keeps the reset flow safe even if someone knows your email.
            </p>

            <button
              onClick={startPasswordReset}
              className="mt-5 w-full rounded-xl bg-blue-600 px-5 py-3 font-bold hover:bg-blue-700 transition"
            >
              {hasPassword ? "Change Password" : "Set Password"}
            </button>

            <div className="mt-5 rounded-2xl bg-black/20 border border-white/10 p-4">
              <p className="font-bold text-sm flex items-center gap-2 text-green-300">
                <CheckCircle2 size={17} />
                Security rule active
              </p>

              <p className="text-white/45 text-sm mt-2 leading-6">
                Email/password login can be changed only after Google login
                verification.
              </p>
            </div>
          </section>

          <section className="xl:col-span-2 rounded-3xl border border-white/10 bg-white/[0.06] p-5">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h3 className="text-xl font-bold">Vault Folders</h3>
                <p className="text-white/45 mt-1">
                  Internal folders created in Google Drive for this app.
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <VaultFolderCard
                title="Root"
                value={driveFolders.root ? "Ready" : "Missing"}
              />

              <VaultFolderCard
                title="Uploads"
                value={driveFolders.uploads ? "Ready" : "Missing"}
              />

              <VaultFolderCard
                title="Logs"
                value={driveFolders.logs ? "Ready" : "Missing"}
              />

              <VaultFolderCard
                title="System"
                value={driveFolders.system ? "Ready" : "Missing"}
              />
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function Avatar({ user }) {
  if (user?.picture) {
    return (
      <img
        src={user.picture}
        alt={user?.name || "User"}
        referrerPolicy="no-referrer"
        className="h-24 w-24 rounded-3xl object-cover border border-white/10 bg-white/10"
      />
    );
  }

  return (
    <div className="h-24 w-24 rounded-3xl bg-blue-600 flex items-center justify-center text-3xl font-bold">
      {user?.name?.charAt(0)?.toUpperCase() || "U"}
    </div>
  );
}

function InfoCard({ title, value, subtitle, icon: Icon, tone = "blue" }) {
  const toneClass =
    tone === "green"
      ? "bg-green-500/15 border-green-400/20 text-green-300"
      : tone === "yellow"
      ? "bg-yellow-500/15 border-yellow-400/20 text-yellow-300"
      : "bg-blue-500/15 border-blue-400/20 text-blue-300";

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div
        className={`h-10 w-10 rounded-xl border flex items-center justify-center mb-4 ${toneClass}`}
      >
        <Icon size={20} />
      </div>

      <p className="text-white/45 text-sm">{title}</p>
      <h4 className="font-bold text-lg mt-1">{value}</h4>
      <p className="text-white/35 text-sm mt-1">{subtitle}</p>
    </div>
  );
}

function VaultFolderCard({ title, value }) {
  const isReady = value === "Ready";

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div
        className={`h-10 w-10 rounded-xl border flex items-center justify-center mb-4 ${
          isReady
            ? "bg-green-500/15 border-green-400/20 text-green-300"
            : "bg-red-500/15 border-red-400/20 text-red-300"
        }`}
      >
        {isReady ? <CheckCircle2 size={20} /> : <LockKeyhole size={20} />}
      </div>

      <p className="text-white/45 text-sm">{title}</p>
      <h4 className="font-bold text-lg mt-1">{value}</h4>
    </div>
  );
}

function formatAuthProvider(provider) {
  if (provider === "google") return "Google";
  if (provider === "password") return "Email / Password";
  return "Unknown";
}

function LoadingSettings() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <div className="h-80 rounded-3xl border border-white/10 bg-white/[0.06] animate-pulse" />
      <div className="h-80 rounded-3xl border border-white/10 bg-white/[0.06] animate-pulse" />
    </div>
  );
}