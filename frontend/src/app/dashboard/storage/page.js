"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  HardDrive,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import {
  apiClient,
  authHeaders,
  formatBytes,
  handleAuthError,
} from "@/lib/api";

const thresholds = [50, 75, 90];

export default function StoragePage() {
  const [storage, setStorage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const loadStorage = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiClient.get("/api/storage/status", {
        headers: authHeaders(),
      });

      setStorage(response.data.status || null);
    } catch (error) {
      if (handleAuthError(error)) return;
      setError(error.response?.data?.message || "Failed to load storage.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStorage();
  }, [loadStorage]);

  const refreshStorage = async () => {
    try {
      setChecking(true);
      setError("");

      const response = await apiClient.get("/api/storage/status", {
        headers: authHeaders(),
      });

      setStorage(response.data.status || null);
    } catch (error) {
      if (handleAuthError(error)) return;
      setError(error.response?.data?.message || "Failed to refresh storage.");
    } finally {
      setChecking(false);
    }
  };

  const usage = Number(storage?.usage || 0);
  const limit = Number(storage?.limit || 0);
  const trash = Number(storage?.usageInDriveTrash || 0);
  const usedPercent = Number(storage?.usedPercent || 0);
  const available = Math.max(limit - usage, 0);

  const safeUsedWidth = Math.min(Math.max(usedPercent, 0.5), 100);
  const trashPercent = limit > 0 ? Number(((trash / limit) * 100).toFixed(4)) : 0;
  const safeTrashWidth = Math.min(Math.max(trashPercent, 0.5), 100);

  const health = getStorageHealth(usedPercent);

  return (
    <>
      <section className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Storage Intelligence</h2>
          <p className="text-white/45 mt-2">
            Track Drive quota, trash usage, and alert thresholds.
          </p>
        </div>

        <button
          onClick={refreshStorage}
          disabled={checking || loading}
          className="rounded-xl border border-white/15 px-5 py-3 font-bold hover:bg-white/10 transition flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {checking ? (
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
        <LoadingStorage />
      ) : (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <StorageCard
              title="Used"
              value={formatBytes(usage)}
              subtitle={`${usedPercent}% of total quota`}
              icon={HardDrive}
            />

            <StorageCard
              title="Available"
              value={formatBytes(available)}
              subtitle="Remaining Drive quota"
              icon={Database}
            />

            <StorageCard
              title="Limit"
              value={formatBytes(limit)}
              subtitle="Total Google Drive quota"
              icon={ShieldCheck}
            />

            <StorageCard
              title="Trash"
              value={formatBytes(trash)}
              subtitle={`${trashPercent}% of total quota`}
              icon={Trash2}
            />
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.8fr] gap-5">
            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-xl font-bold">Quota Usage</h3>
                  <p className="text-white/45 mt-1">
                    Live Google Drive storage used by your account.
                  </p>
                </div>

                <HealthBadge health={health} />
              </div>

              <div className="rounded-2xl bg-black/20 border border-white/10 p-5 mb-5">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <p className="font-bold">Storage used</p>
                  <p className="text-blue-300 font-bold">{usedPercent}%</p>
                </div>

                <div className="h-4 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{
                      width: `${safeUsedWidth}%`,
                    }}
                  />
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <MiniStat label="Used" value={formatBytes(usage)} />
                  <MiniStat label="Available" value={formatBytes(available)} />
                  <MiniStat label="Limit" value={formatBytes(limit)} />
                </div>
              </div>

              <div className="rounded-2xl bg-black/20 border border-white/10 p-5">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <p className="font-bold">Trash usage</p>
                  <p className="text-red-200 font-bold">{trashPercent}%</p>
                </div>

                <div className="h-4 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-red-500 transition-all"
                    style={{
                      width: `${safeTrashWidth}%`,
                    }}
                  />
                </div>

                <p className="text-white/45 text-sm mt-4">
                  Trash still counts in Drive quota until permanently deleted
                  from Google Drive.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
              <h3 className="text-xl font-bold mb-2">Alert Thresholds</h3>
              <p className="text-white/45 mb-5">
                Your backend checks storage after uploads and deletes.
              </p>

              <div className="space-y-3">
                {thresholds.map((threshold) => {
                  const crossed = usedPercent >= threshold;

                  return (
                    <div
                      key={threshold}
                      className="rounded-2xl bg-black/20 border border-white/10 p-4 flex items-center justify-between gap-4"
                    >
                      <div>
                        <p className="font-bold">{threshold}% usage</p>
                        <p className="text-white/40 text-sm">
                          {crossed ? "Threshold crossed" : "Not reached yet"}
                        </p>
                      </div>

                      {crossed ? (
                        <AlertTriangle className="text-yellow-300" size={22} />
                      ) : (
                        <CheckCircle2 className="text-green-300" size={22} />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 rounded-2xl bg-blue-500/10 border border-blue-400/20 p-4">
                <p className="text-blue-200 font-bold">Current status</p>
                <p className="text-white/55 text-sm mt-2 leading-6">
                  {health.message}
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}

function StorageCard({ title, value, subtitle, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
      <div className="h-11 w-11 rounded-xl bg-blue-500/15 border border-blue-400/20 flex items-center justify-center text-blue-300 mb-4">
        <Icon size={22} />
      </div>

      <p className="text-white/50 text-sm">{title}</p>
      <h3 className="text-2xl font-bold mt-2">{value}</h3>
      <p className="text-white/40 text-sm mt-1">{subtitle}</p>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-white/40 text-xs">{label}</p>
      <p className="font-bold mt-2">{value}</p>
    </div>
  );
}

function HealthBadge({ health }) {
  return (
    <div
      className={`rounded-full px-4 py-2 text-xs font-bold ${health.className}`}
    >
      {health.label}
    </div>
  );
}

function getStorageHealth(percent) {
  if (percent >= 90) {
    return {
      label: "Critical",
      className: "bg-red-500/15 text-red-200",
      message:
        "Storage usage is above 90%. You should clean files or upgrade storage soon.",
    };
  }

  if (percent >= 75) {
    return {
      label: "High",
      className: "bg-yellow-500/15 text-yellow-200",
      message:
        "Storage usage is above 75%. Keep an eye on uploads and old files.",
    };
  }

  if (percent >= 50) {
    return {
      label: "Moderate",
      className: "bg-blue-500/15 text-blue-200",
      message:
        "Storage usage is above 50%. No urgent action needed, but monitoring is active.",
    };
  }

  return {
    label: "Healthy",
    className: "bg-green-500/15 text-green-200",
    message:
      "Storage usage is low. Your vault has enough available space right now.",
  };
}

function LoadingStorage() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-40 rounded-2xl bg-white/[0.06] border border-white/10 animate-pulse"
        />
      ))}
    </div>
  );
}