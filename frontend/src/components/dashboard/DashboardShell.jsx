"use client";


import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";


import {
  apiClient,
  authHeaders,
  clearAuth,
  getSavedUser,
  getToken,
  handleAuthError,
} from "@/lib/api";

const DashboardContext = createContext(null);

export const useDashboard = () => {
  return useContext(DashboardContext);
};

export default function DashboardShell({ children }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const pathname = usePathname();

const pageMeta = getPageMeta(pathname);

  const loadUser = async () => {
    try {
      const token = getToken();

      if (!token) {
        window.location.href = "/login";
        return;
      }

      const savedUser = getSavedUser();

      if (savedUser) {
        setUser(savedUser);
      }

      const response = await apiClient.get("/api/auth/me", {
        headers: authHeaders(),
      });

      setUser(response.data.user);
      localStorage.setItem("drive_app_user", JSON.stringify(response.data.user));
    } catch (error) {
      if (handleAuthError(error)) return;

      clearAuth();
      window.location.href = "/login";
    } finally {
      setCheckingAuth(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const handleLogout = async () => {
    try {
      setLogoutLoading(true);

      const token = getToken();

      if (token) {
        await apiClient.post(
          "/api/auth/logout",
          {},
          {
            headers: authHeaders(),
          }
        );
      }
    } catch {
      // Clear local session even if backend logout fails.
    } finally {
      clearAuth();
      window.location.href = "/login";
    }
  };

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-[#07111f] text-white flex items-center justify-center">
        <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-blue-500 flex items-center justify-center font-bold text-xl">
            D
          </div>
          <p className="text-white/70">Checking session...</p>
        </div>
      </main>
    );
  }

  return (
    <DashboardContext.Provider
      value={{
        user,
        reloadUser: loadUser,
      }}
    >
      <main className="min-h-screen bg-[#07111f] text-white">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-[-120px] left-[-120px] h-[360px] w-[360px] rounded-full bg-blue-600/15 blur-3xl" />
          <div className="absolute bottom-[-180px] right-[-180px] h-[420px] w-[420px] rounded-full bg-cyan-500/10 blur-3xl" />
        </div>

        <div className="relative z-10 flex min-h-screen">
          <aside className="hidden lg:flex w-64 shrink-0 border-r border-white/10 bg-white/[0.04] p-4 flex-col">
            <Sidebar
              user={user}
              onLogout={handleLogout}
              logoutLoading={logoutLoading}
            />
          </aside>

          {mobileSidebarOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div
                className="absolute inset-0 bg-black/60"
                onClick={() => setMobileSidebarOpen(false)}
              />

              <aside className="relative h-full w-[86%] max-w-sm border-r border-white/10 bg-[#0b1020] p-5 flex flex-col">
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => setMobileSidebarOpen(false)}
                    className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center"
                  >
                    <X size={20} />
                  </button>
                </div>

                <Sidebar
                  user={user}
                  onLogout={handleLogout}
                  logoutLoading={logoutLoading}
                />
              </aside>
            </div>
          )}

          <section className="flex-1 min-w-0">
            {/* <Topbar
              title="Dashboard"
              subtitle="Manage your private Drive Vault."
              onMenuClick={() => setMobileSidebarOpen(true)}
            /> */}
            <Topbar
            title={pageMeta.title}
            subtitle={pageMeta.subtitle}
            onMenuClick={() => setMobileSidebarOpen(true)}
            />

            <div className="p-4 sm:p-6">{children}</div>
          </section>
        </div>
      </main>
    </DashboardContext.Provider>
  );
  function getPageMeta(pathname) {
  if (pathname === "/dashboard/files") {
    return {
      title: "File Vault",
      subtitle: "Upload, organize, and manage your private files.",
    };
  }

  if (pathname === "/dashboard/storage") {
    return {
      title: "Storage",
      subtitle: "Track your Google Drive usage and vault quota.",
    };
  }

  if (pathname === "/dashboard/logs") {
    return {
      title: "Activity Logs",
      subtitle: "Review uploads, downloads, folders, and security events.",
    };
  }

  if (pathname === "/dashboard/settings") {
    return {
      title: "Settings",
      subtitle: "Manage your profile and security preferences.",
    };
  }

  return {
    title: "Dashboard",
    subtitle: "Manage your private Drive Vault.",
  };
}
}
