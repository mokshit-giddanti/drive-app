"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  HardDrive,
  History,
  Home,
  LogOut,
  ShieldCheck,
  User,
} from "lucide-react";

const navItems = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: Home,
  },
  {
    label: "Files & Folders",
    href: "/dashboard/files",
    icon: FileText,
  },
  {
    label: "Storage",
    href: "/dashboard/storage",
    icon: HardDrive,
  },
  {
    label: "Activity Logs",
    href: "/dashboard/logs",
    icon: History,
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: User,
  },
];

export default function Sidebar({ user, onLogout, logoutLoading }) {
  const pathname = usePathname();

  const isActive = (href) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-11 w-11 rounded-2xl bg-blue-500 flex items-center justify-center text-lg font-bold">
          D
        </div>

        <div>
          <h2 className="font-bold text-lg">Drive Vault</h2>
          <p className="text-white/40 text-sm">Private dashboard</p>
        </div>
      </div>

      <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-3 mb-5">
        <div className="flex items-center gap-3">
          <Avatar user={user} />

          <div className="min-w-0 flex-1">
            <p className="font-bold truncate">{user?.name || "User"}</p>
            <p className="text-white/40 text-xs truncate">
              {user?.email || "No email"}
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          disabled={logoutLoading}
          className="mt-4 w-full rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2.5 text-red-200 text-sm font-bold hover:bg-red-500/20 transition flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <LogOut size={16} />
          {logoutLoading ? "Logging out..." : "Logout"}
        </button>
      </div>

      <nav className="space-y-2">
        {navItems.map(({ label, href, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              isActive(href)
                ? "bg-blue-600 text-white"
                : "text-white/60 hover:text-white hover:bg-white/10"
            }`}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="mt-5 rounded-xl bg-green-500/10 border border-green-400/15 px-4 py-3 flex items-center gap-2 text-green-200 text-xs">
        <ShieldCheck size={15} />
        Session protected
      </div>
    </div>
  );
}

function Avatar({ user }) {
  const picture = user?.picture;

  if (picture) {
    return (
      <img
        src={picture}
        alt={user?.name || "User"}
        referrerPolicy="no-referrer"
        className="h-11 w-11 rounded-full object-cover border border-white/10 bg-white/10"
      />
    );
  }

  return (
    <div className="h-11 w-11 rounded-full bg-blue-500 flex items-center justify-center font-bold">
      {user?.name?.charAt(0)?.toUpperCase() || <User size={20} />}
    </div>
  );
}