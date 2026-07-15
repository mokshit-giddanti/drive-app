"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Folder,
  FolderPlus,
  History,
  LogIn,
  LogOut,
  Pencil,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UploadCloud,
  XCircle,
} from "lucide-react";

import {
  apiClient,
  authHeaders,
  formatBytes,
  handleAuthError,
} from "@/lib/api";

const actionColorMap = {
  GOOGLE_LOGIN_SUCCESS: "bg-blue-500/15 text-blue-300 border-blue-400/20",
  PASSWORD_LOGIN_SUCCESS: "bg-green-500/15 text-green-300 border-green-400/20",
  PASSWORD_SET_OR_RESET:
    "bg-purple-500/15 text-purple-300 border-purple-400/20",
  LOGOUT: "bg-red-500/15 text-red-300 border-red-400/20",

  FILE_UPLOAD: "bg-blue-500/15 text-blue-300 border-blue-400/20",
  FILE_DOWNLOAD: "bg-cyan-500/15 text-cyan-300 border-cyan-400/20",
  FILE_RENAME: "bg-yellow-500/15 text-yellow-300 border-yellow-400/20",
  FILE_DELETE: "bg-red-500/15 text-red-300 border-red-400/20",

  FOLDER_CREATE: "bg-green-500/15 text-green-300 border-green-400/20",
  FOLDER_RENAME: "bg-yellow-500/15 text-yellow-300 border-yellow-400/20",
  FOLDER_DELETE: "bg-red-500/15 text-red-300 border-red-400/20",

  STORAGE_ALERT_TRIGGERED:
    "bg-orange-500/15 text-orange-300 border-orange-400/20",
  STORAGE_CHECK: "bg-indigo-500/15 text-indigo-300 border-indigo-400/20",
};

const filters = [
  {
    label: "All",
    value: "all",
  },
  {
    label: "Files",
    value: "files",
  },
  {
    label: "Folders",
    value: "folders",
  },
  {
    label: "Auth",
    value: "auth",
  },
  {
    label: "Storage",
    value: "storage",
  },
];

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [error, setError] = useState("");

  const loadLogs = useCallback(async ({ silent = false } = {}) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await apiClient.get("/api/logs?limit=100", {
        headers: authHeaders(),
      });

      setLogs(response.data.logs || []);
    } catch (error) {
      if (handleAuthError(error)) return;
      setError(error.response?.data?.message || "Failed to load activity logs.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const filteredLogs = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return logs.filter((log) => {
      const category = getLogCategory(log.action);

      const matchesFilter =
        activeFilter === "all" || activeFilter === category;

      const searchableText = [
        log.action,
        log.status,
        log.email,
        log.fileName,
        log.folderName,
        log.parentFolderName,
        log.mimeType,
        log.fileId,
        log.folderId,
        log.parentFolderId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !keyword || searchableText.includes(keyword.toLowerCase());

      return matchesFilter && matchesSearch;
    });
  }, [logs, search, activeFilter]);

  const summary = useMemo(() => {
    return {
      total: logs.length,
      files: logs.filter((log) => getLogCategory(log.action) === "files")
        .length,
      folders: logs.filter((log) => getLogCategory(log.action) === "folders")
        .length,
      auth: logs.filter((log) => getLogCategory(log.action) === "auth").length,
    };
  }, [logs]);

  return (
    <>
      <section className="mb-6 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Activity Timeline</h2>
          <p className="text-white/45 mt-2">
            Review file, folder, login, logout, and storage events.
          </p>
        </div>

        <button
          onClick={() => loadLogs({ silent: true })}
          disabled={loading || refreshing}
          className="rounded-xl border border-white/15 px-5 py-3 font-bold hover:bg-white/10 transition flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <RefreshCw
            size={18}
            className={refreshing || loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </section>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-red-200">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          title="Total Events"
          value={loading ? "..." : summary.total}
          subtitle="Latest logs loaded"
          icon={History}
        />

        <SummaryCard
          title="File Events"
          value={loading ? "..." : summary.files}
          subtitle="Uploads, downloads, renames, deletes"
          icon={FileText}
        />

        <SummaryCard
          title="Folder Events"
          value={loading ? "..." : summary.folders}
          subtitle="Create, rename, delete"
          icon={Folder}
        />

        <SummaryCard
          title="Auth Events"
          value={loading ? "..." : summary.auth}
          subtitle="Login, logout, password reset"
          icon={ShieldCheck}
        />
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-5">
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setActiveFilter(filter.value)}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                  activeFilter === filter.value
                    ? "bg-blue-600 text-white"
                    : "bg-black/20 border border-white/10 text-white/55 hover:text-white hover:bg-white/10"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search logs..."
              className="w-full xl:w-96 rounded-xl bg-black/25 border border-white/10 pl-11 pr-4 py-3 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonLog key={index} />
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <EmptyLogs />
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log, index) => (
              <LogCard key={`${log.timestamp}-${index}`} log={log} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function LogCard({ log }) {
  const Icon = getLogIcon(log.action);
  const target = getLogTarget(log);
  const description = getLogDescription(log);
  const category = getLogCategory(log.action);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 hover:bg-white/[0.04] transition">
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="h-11 w-11 rounded-xl bg-blue-500/15 border border-blue-400/20 flex items-center justify-center text-blue-300 shrink-0">
            <Icon size={22} />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <ActionPill action={log.action} />

              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/45">
                {category}
              </span>
            </div>

            <h3 className="font-bold truncate">{target}</h3>

            {description && (
              <p className="text-white/45 text-sm mt-1 leading-6">
                {description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-white/40">
              <span className="inline-flex items-center gap-1">
                <Clock3 size={14} />
                {formatLogTime(log.timestamp)}
              </span>

              {log.email && <span>{log.email}</span>}
            </div>
          </div>
        </div>

        <StatusBadge status={log.status} />
      </div>
    </div>
  );
}

function ActionPill({ action }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
        actionColorMap[action] || "bg-white/10 text-white/70 border-white/10"
      }`}
    >
      {action || "UNKNOWN"}
    </span>
  );
}

function StatusBadge({ status }) {
  const isSuccess = !status || status === "SUCCESS";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold shrink-0 ${
        isSuccess
          ? "bg-green-500/15 text-green-300"
          : "bg-red-500/15 text-red-300"
      }`}
    >
      {isSuccess ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
      {status || "SUCCESS"}
    </span>
  );
}

function SummaryCard({ title, value, subtitle, icon: Icon }) {
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

function SkeletonLog() {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="h-11 w-11 rounded-xl bg-white/10" />

        <div className="flex-1">
          <div className="h-5 w-40 rounded-full bg-white/10 mb-3" />
          <div className="h-4 w-64 rounded-full bg-white/10 mb-2" />
          <div className="h-4 w-44 rounded-full bg-white/10" />
        </div>
      </div>
    </div>
  );
}

function EmptyLogs() {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-8 text-center">
      <div className="mx-auto h-14 w-14 rounded-2xl bg-blue-500/15 border border-blue-400/20 flex items-center justify-center text-blue-300 mb-5">
        <Activity size={28} />
      </div>

      <h3 className="text-xl font-bold">No logs found</h3>

      <p className="text-white/50 mt-3 max-w-md mx-auto">
        Try changing the filter, clearing search, or performing a file/folder
        action first.
      </p>
    </div>
  );
}

function getLogCategory(action = "") {
  if (action.startsWith("FILE_")) return "files";
  if (action.startsWith("FOLDER_")) return "folders";
  if (
    action.includes("LOGIN") ||
    action.includes("LOGOUT") ||
    action.includes("PASSWORD")
  ) {
    return "auth";
  }
  if (action.includes("STORAGE")) return "storage";

  return "other";
}

function getLogIcon(action = "") {
  const iconMap = {
    FILE_UPLOAD: UploadCloud,
    FILE_DOWNLOAD: Download,
    FILE_RENAME: Pencil,
    FILE_DELETE: Trash2,

    FOLDER_CREATE: FolderPlus,
    FOLDER_RENAME: Pencil,
    FOLDER_DELETE: Trash2,

    GOOGLE_LOGIN_SUCCESS: LogIn,
    PASSWORD_LOGIN_SUCCESS: LogIn,
    PASSWORD_SET_OR_RESET: ShieldCheck,
    LOGOUT: LogOut,

    STORAGE_ALERT_TRIGGERED: ShieldCheck,
    STORAGE_CHECK: ShieldCheck,
  };

  return iconMap[action] || Activity;
}

function getLogTarget(log) {
  if (log.fileName) return `File: ${log.fileName}`;
  if (log.folderName) return `Folder: ${log.folderName}`;
  if (log.parentFolderName) return `Folder: ${log.parentFolderName}`;
  if (log.email) return log.email;

  if (log.fileId) return "File activity";
  if (log.folderId) return "Folder activity";

  return "Vault activity";
}

function getLogDescription(log) {
  if (log.action === "FILE_UPLOAD") {
    const location = getUploadLocation(log);
    const size = log.size ? `Size: ${formatBytes(log.size)}.` : "";
    const mimeType = log.mimeType ? `Type: ${log.mimeType}.` : "";

    return [location, size, mimeType].filter(Boolean).join(" ");
  }

  if (log.action === "FILE_DOWNLOAD") {
    return "File was downloaded from the vault.";
  }

  if (log.action === "FILE_RENAME") {
    return "File name was updated.";
  }

  if (log.action === "FILE_DELETE") {
    return "File was moved to trash.";
  }

  if (log.action === "FOLDER_CREATE") {
    return "Folder was created in the vault.";
  }

  if (log.action === "FOLDER_RENAME") {
    return "Folder name was updated.";
  }

  if (log.action === "FOLDER_DELETE") {
    return "Folder was moved to trash.";
  }

  if (log.action === "GOOGLE_LOGIN_SUCCESS") {
    return "User logged in using Google authentication.";
  }

  if (log.action === "PASSWORD_LOGIN_SUCCESS") {
    return "User logged in using email and password.";
  }

  if (log.action === "PASSWORD_SET_OR_RESET") {
    return "Password was created or reset.";
  }

  if (log.action === "LOGOUT") {
    return "User logged out and session token was invalidated.";
  }

  if (log.action === "STORAGE_ALERT_TRIGGERED") {
    return getStorageAlertText(log);
  }

  return "";
}

function getUploadLocation(log) {
  if (log.uploadLocationType === "uploads_root") {
    return "Uploaded directly into Vault Root.";
  }

  if (log.uploadLocationType === "folder" && log.parentFolderName) {
    return `Uploaded inside folder: ${log.parentFolderName}.`;
  }

  if (log.parentFolderId) {
    return "Uploaded inside a folder.";
  }

  return "";
}

function getStorageAlertText(log) {
  if (!log.alertsTriggered?.length) {
    return "Storage alert was triggered.";
  }

  const thresholds = log.alertsTriggered
    .map((item) => `${item.threshold}%`)
    .join(", ");

  return `Storage threshold crossed: ${thresholds}.`;
}

function formatLogTime(timestamp) {
  if (!timestamp) return "No timestamp";

  return new Date(timestamp).toLocaleString();
}