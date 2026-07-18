"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Database,
  FileText,
  Folder,
  HardDrive,
  History,
} from "lucide-react";

import {
  apiClient,
  authHeaders,
  formatBytes,
  handleAuthError,
} from "@/lib/api";

import { useDashboard } from "@/components/dashboard/DashboardShell";

const actionColorMap = {
  GOOGLE_LOGIN_SUCCESS: "bg-blue-500/15 text-blue-300",
  PASSWORD_LOGIN_SUCCESS: "bg-green-500/15 text-green-300",
  PASSWORD_SET_OR_RESET: "bg-purple-500/15 text-purple-300",
  LOGOUT: "bg-red-500/15 text-red-300",

  FILE_UPLOAD: "bg-blue-500/15 text-blue-300",
  FILE_DOWNLOAD: "bg-cyan-500/15 text-cyan-300",
  FILE_RENAME: "bg-yellow-500/15 text-yellow-300",
  FILE_DELETE: "bg-red-500/15 text-red-300",

  FOLDER_CREATE: "bg-green-500/15 text-green-300",
  FOLDER_RENAME: "bg-yellow-500/15 text-yellow-300",
  FOLDER_DELETE: "bg-red-500/15 text-red-300",

  STORAGE_CHECK: "bg-indigo-500/15 text-indigo-300",
  STORAGE_ALERT_TRIGGERED: "bg-orange-500/15 text-orange-300",
};

const getLogTarget = (log) => {
  if (log.action === "STORAGE_CHECK") return "Storage quota checked";
  if (log.action === "STORAGE_ALERT_TRIGGERED") return "Storage alert triggered";

  if (log.fileName) return `File: ${log.fileName}`;
  if (log.folderName) return `Folder: ${log.folderName}`;
  if (log.email) return log.email;

  if (log.fileId) return "File activity";
  if (log.folderId) return "Folder activity";

  return "Vault activity";
};

const getLogLocation = (log) => {
  if (log.locationType === "vault_root") {
    return "Location: Vault Root";
  }

  if (log.locationType === "folder" && log.parentFolderName) {
    return `Location: Folder: ${log.parentFolderName}`;
  }

  if (log.uploadLocationType === "uploads_root") {
    return "Location: Vault Root";
  }

  if (log.uploadLocationType === "folder" && log.parentFolderName) {
    return `Location: Folder: ${log.parentFolderName}`;
  }

  if (log.parentFolderName) {
    return `Location: ${log.parentFolderName}`;
  }

  return null;
};

const getLogExtraText = (log) => {
  if (log.action === "FILE_RENAME" && log.oldFileName) {
    return `Old name: ${log.oldFileName}`;
  }

  if (log.action === "FOLDER_RENAME" && log.oldFolderName) {
    return `Old name: ${log.oldFolderName}`;
  }

  if (log.action === "STORAGE_CHECK") {
    const parts = [];

    if (log.usedPercent !== undefined) {
      parts.push(`Used: ${log.usedPercent}%`);
    }

    if (log.usage !== undefined) {
      parts.push(`Usage: ${formatBytes(log.usage)}`);
    }

    if (log.limit !== undefined) {
      parts.push(`Limit: ${formatBytes(log.limit)}`);
    }

    return parts.join(" • ");
  }

  return null;
};

export default function DashboardPage() {
  const { user } = useDashboard();

  const [storage, setStorage] = useState(null);
  const [logs, setLogs] = useState([]);
  const [filesCount, setFilesCount] = useState(0);
  const [foldersCount, setFoldersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const [storageRes, logsRes, filesRes, foldersRes] = await Promise.all([
        apiClient.get("/api/storage/status", {
          headers: authHeaders(),
        }),
        apiClient.get("/api/logs?limit=6", {
          headers: authHeaders(),
        }),
        apiClient.get("/api/files", {
          headers: authHeaders(),
        }),
        apiClient.get("/api/folders", {
          headers: authHeaders(),
        }),
      ]);

      setStorage(storageRes.data.status);
      setLogs(logsRes.data.logs || []);
      setFilesCount(filesRes.data.count || 0);
      setFoldersCount(foldersRes.data.count || 0);
    } catch (error) {
      if (handleAuthError(error)) return;
      setError(error.response?.data?.message || "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const usedPercent = Number(storage?.usedPercent || 0);
  const storageWidth = Math.min(Math.max(usedPercent, 0.5), 100);

  return (
    <>
      {error && (
        <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-red-200">
          {error}
        </div>
      )}

      <section className="mb-6">
        <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 sm:p-6 overflow-hidden relative">
          <div className="absolute right-[-80px] top-[-80px] h-64 w-64 rounded-full bg-blue-500/15 blur-3xl" />

          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <p className="text-blue-300 font-semibold mb-2">Welcome back</p>
              <h2 className="text-2xl sm:text-3xl font-bold">
                {user?.name || "Drive Vault User"}
              </h2>
              <p className="text-white/60 mt-3 max-w-2xl leading-7">
                Your backend is connected, authentication is active, and your
                Google Drive vault is ready to manage files.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/dashboard/files"
                className="rounded-xl bg-blue-600 px-5 py-3 text-center font-bold hover:bg-blue-700 transition"
              >
                Upload File
              </Link>

              <Link
                href="/dashboard/logs"
                className="rounded-xl border border-white/15 px-5 py-3 text-center font-bold hover:bg-white/10 transition"
              >
                View Logs
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          title="Files"
          value={loading ? "..." : filesCount}
          subtitle="Files in uploads"
          icon={FileText}
        />

        <SummaryCard
          title="Folders"
          value={loading ? "..." : foldersCount}
          subtitle="Folders in uploads"
          icon={Folder}
        />

        <SummaryCard
          title="Storage Used"
          value={loading ? "..." : `${usedPercent}%`}
          subtitle={storage ? `${formatBytes(storage.usage)} used` : "Loading"}
          icon={HardDrive}
        />

        <SummaryCard
          title="Activity Logs"
          value={loading ? "..." : logs.length}
          subtitle="Recent events loaded"
          icon={Activity}
        />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h3 className="text-xl font-bold">Storage Overview</h3>
              <p className="text-white/50 mt-1 text-sm">
                Live Google Drive quota status.
              </p>
            </div>

            <div className="h-11 w-11 rounded-xl bg-blue-500/15 border border-blue-400/20 flex items-center justify-center text-blue-300">
              <Database size={22} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <MiniStat
              label="Used"
              value={storage ? formatBytes(storage.usage) : "..."}
            />

            <MiniStat
              label="Limit"
              value={storage ? formatBytes(storage.limit) : "..."}
            />

            <MiniStat
              label="Trash"
              value={storage ? formatBytes(storage.usageInDriveTrash) : "..."}
            />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-3">
              <span className="text-white/60">Usage percentage</span>
              <span className="text-blue-300 font-bold">
                {storage ? `${usedPercent}%` : "..."}
              </span>
            </div>

            <div className="h-3 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{
                  width: `${storageWidth}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h3 className="text-xl font-bold">Recent Activity</h3>
              <p className="text-white/50 mt-1 text-sm">
                Latest vault operations with target names.
              </p>
            </div>

            <div className="h-11 w-11 rounded-xl bg-blue-500/15 border border-blue-400/20 flex items-center justify-center text-blue-300">
              <History size={22} />
            </div>
          </div>

          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {loading && (
              <>
                <SkeletonLog />
                <SkeletonLog />
                <SkeletonLog />
              </>
            )}

            {!loading && logs.length === 0 && (
              <div className="rounded-2xl bg-black/20 border border-white/10 p-4 text-white/50 text-sm">
                No logs found yet.
              </div>
            )}

            {!loading &&
              logs.map((log, index) => {
                const target = getLogTarget(log);
                const location = getLogLocation(log);
                const extraText = getLogExtraText(log);

                return (
                  <div
                    key={`${log.timestamp}-${index}`}
                    className="rounded-2xl bg-black/20 border border-white/10 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                            actionColorMap[log.action] ||
                            "bg-white/10 text-white/70"
                          }`}
                        >
                          {log.action || "UNKNOWN"}
                        </span>

                        <p className="mt-3 font-semibold text-white truncate">
                          {target}
                        </p>

                        {location && (
                          <p className="text-blue-300/80 text-sm mt-1 truncate">
                            {location}
                          </p>
                        )}

                        {extraText && (
                          <p className="text-white/45 text-sm mt-1 truncate">
                            {extraText}
                          </p>
                        )}

                        <p className="text-white/45 text-xs mt-2">
                          {log.timestamp
                            ? new Date(log.timestamp).toLocaleString()
                            : "No timestamp"}
                        </p>
                      </div>

                      <span className="text-xs text-green-300 shrink-0">
                        {log.status || "SUCCESS"}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </section>
    </>
  );
}

function SummaryCard({ title, value, subtitle, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 hover:bg-white/[0.08] transition">
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
    <div className="rounded-xl bg-black/20 border border-white/10 p-4">
      <p className="text-white/45 text-xs">{label}</p>
      <p className="font-bold text-base mt-2">{value}</p>
    </div>
  );
}

function SkeletonLog() {
  return (
    <div className="rounded-2xl bg-black/20 border border-white/10 p-4 animate-pulse">
      <div className="h-5 w-32 bg-white/10 rounded-full mb-4" />
      <div className="h-4 w-44 bg-white/10 rounded-full" />
    </div>
  );
}