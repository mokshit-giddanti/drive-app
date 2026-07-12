"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Menu,
  X,
  ShieldCheck,
  Cloud,
  FileText,
  Folder,
  History,
  HardDrive,
  LockKeyhole,
  ArrowRight,
  CheckCircle2,
  UploadCloud,
  Database,
  Activity,
  KeyRound,
  Sparkles,
  Server,
} from "lucide-react";

const features = [
  {
    title: "Google Drive Powered",
    desc: "Your files stay inside your own Google Drive space, while Drive Vault gives you a cleaner control layer.",
    icon: Cloud,
  },
  {
    title: "Smart File Management",
    desc: "Upload, download, rename, delete, and manage files from one private dashboard.",
    icon: FileText,
  },
  {
    title: "Folder Organization",
    desc: "Create folders, organize content, navigate your vault, and keep your files structured.",
    icon: Folder,
  },
  {
    title: "Activity Logs",
    desc: "Every upload, rename, download, delete, login, and storage check is tracked in daily logs.",
    icon: History,
  },
  {
    title: "Storage Monitoring",
    desc: "View your Google Drive usage and get alert tracking for 50%, 75%, and 90% thresholds.",
    icon: HardDrive,
  },
  {
    title: "Private Access",
    desc: "Protected using Google login, password login, token validation, and logout revocation.",
    icon: ShieldCheck,
  },
];

const steps = [
  {
    number: "01",
    title: "Login securely",
    desc: "Verify yourself with Google or your password login.",
    icon: KeyRound,
  },
  {
    number: "02",
    title: "Vault setup",
    desc: "Private folders for uploads, logs, and system data are created automatically.",
    icon: Database,
  },
  {
    number: "03",
    title: "Manage files",
    desc: "Upload, organize, download, rename, and delete files from your dashboard.",
    icon: UploadCloud,
  },
  {
    number: "04",
    title: "Track everything",
    desc: "Monitor activity logs, storage usage, and alerts from one place.",
    icon: Activity,
  },
];

const securityItems = [
  {
    title: "Google-authenticated access",
    desc: "Login starts with Google verification for account ownership.",
    icon: ShieldCheck,
  },
  {
    title: "Your own Drive storage",
    desc: "Files remain inside your Google Drive, not a random third-party bucket.",
    icon: Cloud,
  },
  {
    title: "Revoked logout tokens",
    desc: "Logout invalidates the old session token from the backend.",
    icon: LockKeyhole,
  },
  {
    title: "Operation audit logs",
    desc: "Important actions are written to your private log files.",
    icon: History,
  },
];

export default function HomePage() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMenu = () => setMobileOpen(false);

  return (
    <main className="min-h-screen bg-[#07111f] text-white overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-120px] left-[-120px] h-[360px] w-[360px] rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute top-[220px] right-[-160px] h-[420px] w-[420px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-[-180px] left-[30%] h-[420px] w-[420px] rounded-full bg-blue-700/10 blur-3xl" />
      </div>

      <nav className="relative z-20 max-w-7xl mx-auto px-5 sm:px-6 py-5">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-blue-500 flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-500/20">
              D
            </div>
            <span className="text-lg sm:text-xl font-bold">Drive Vault</span>
          </Link>

          <div className="hidden lg:flex items-center gap-8 text-sm text-white/70">
            <a href="#features" className="hover:text-white transition">
              Features
            </a>
            <a href="#how" className="hover:text-white transition">
              How it works
            </a>
            <a href="#security" className="hover:text-white transition">
              Security
            </a>
          </div>

          <div className="hidden sm:flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold hover:bg-white/10 transition"
            >
              Login
            </Link>

            <Link
              href="/login"
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold hover:bg-blue-700 transition shadow-lg shadow-blue-600/20"
            >
              Get Started
            </Link>
          </div>

          <button
            onClick={() => setMobileOpen((value) => !value)}
            className="sm:hidden h-11 w-11 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="sm:hidden mt-4 rounded-2xl border border-white/10 bg-[#111b2a] p-4 shadow-2xl">
            <div className="grid gap-2 text-white/80">
              <a
                href="#features"
                onClick={closeMenu}
                className="rounded-xl px-3 py-3 hover:bg-white/10"
              >
                Features
              </a>
              <a
                href="#how"
                onClick={closeMenu}
                className="rounded-xl px-3 py-3 hover:bg-white/10"
              >
                How it works
              </a>
              <a
                href="#security"
                onClick={closeMenu}
                className="rounded-xl px-3 py-3 hover:bg-white/10"
              >
                Security
              </a>

              <div className="grid grid-cols-2 gap-3 pt-3">
                <Link
                  href="/login"
                  className="rounded-xl border border-white/15 px-4 py-3 text-center font-semibold hover:bg-white/10"
                >
                  Login
                </Link>
                <Link
                  href="/login"
                  className="rounded-xl bg-blue-600 px-4 py-3 text-center font-semibold hover:bg-blue-700"
                >
                  Start
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      <section className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 pt-12 sm:pt-20 pb-20 sm:pb-28 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-400/10 px-4 py-2 text-sm text-blue-200 mb-6">
            <Sparkles size={16} />
            Personal Google Drive file vault
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-bold leading-[1.08] tracking-tight">
            Manage your files with clarity, control, and privacy.
          </h1>

          <p className="text-white/65 text-base sm:text-lg mt-6 max-w-2xl leading-8">
            Drive Vault is a personal file management layer built on top of your
            Google Drive. Upload, organize, download, monitor storage, and track
            every activity from one clean dashboard.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mt-9">
            <Link
              href="/login"
              className="rounded-2xl bg-blue-600 px-7 py-4 text-center font-bold hover:bg-blue-700 transition shadow-xl shadow-blue-600/20"
            >
              Start Managing Files
            </Link>

            <Link
              href="/reset-password"
              className="rounded-2xl border border-white/15 px-7 py-4 text-center font-bold hover:bg-white/10 transition"
            >
              Reset Password
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8 max-w-2xl">
            {["Google Drive based", "Activity logs", "Storage alerts"].map(
              (item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 text-sm text-white/60"
                >
                  <CheckCircle2 size={17} className="text-blue-300" />
                  {item}
                </div>
              )
            )}
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 sm:-inset-10 bg-blue-500/20 blur-3xl rounded-full" />

          <div className="relative rounded-[2rem] border border-white/10 bg-white/10 p-3 sm:p-5 shadow-2xl backdrop-blur">
            <div className="rounded-[1.5rem] bg-[#0b1020] border border-white/10 p-5 sm:p-7">
              <div className="flex justify-between items-start gap-5 mb-7">
                <div>
                  <div className="flex items-center gap-2 text-white/45 text-sm mb-2">
                    <Server size={16} />
                    Private Vault
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold">
                    Dashboard Preview
                  </h3>
                </div>
                <div className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-full bg-blue-500 shadow-lg shadow-blue-500/25 flex items-center justify-center">
                  <ShieldCheck size={26} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  ["Files", "128", FileText],
                  ["Folders", "16", Folder],
                  ["Storage", "0.7%", HardDrive],
                ].map(([label, value, Icon]) => (
                  <div key={label} className="rounded-2xl bg-white/10 p-4">
                    <div className="flex items-center gap-2 text-white/40 text-xs sm:text-sm">
                      <Icon size={15} />
                      <span>{label}</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold mt-3">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl bg-white/10 p-4 mb-4">
                <div className="flex justify-between text-sm mb-3">
                  <span className="font-semibold">Storage usage</span>
                  <span className="text-blue-300">15 GB</span>
                </div>
                <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full w-[18%] bg-blue-500 rounded-full" />
                </div>
              </div>

              <div className="space-y-3">
                {[
                  ["Uploaded project-report.pdf", UploadCloud],
                  ["Created folder Documents", Folder],
                  ["Downloaded invoice.json", FileText],
                ].map(([item, Icon]) => (
                  <div
                    key={item}
                    className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white/70 flex items-center gap-3"
                  >
                    <div className="h-8 w-8 rounded-lg bg-blue-500/15 flex items-center justify-center text-blue-300">
                      <Icon size={16} />
                    </div>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
        <div className="text-center mb-12 sm:mb-16">
          <p className="text-blue-300 font-semibold mb-3">Features</p>
          <h2 className="text-3xl sm:text-5xl font-bold">
            Everything your vault needs
          </h2>
          <p className="text-white/60 mt-4 max-w-2xl mx-auto text-base sm:text-lg">
            A complete file dashboard for uploads, folders, logs, storage, and
            secure access.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {features.map(({ title, desc, icon: Icon }) => (
            <div
              key={title}
              className="group rounded-3xl bg-white/[0.07] border border-white/10 p-6 sm:p-7 hover:bg-white/[0.1] hover:-translate-y-1 transition duration-300"
            >
              <div className="h-14 w-14 rounded-2xl bg-blue-500/15 border border-blue-400/20 flex items-center justify-center text-blue-300 mb-7 group-hover:bg-blue-500 group-hover:text-white transition">
                <Icon size={27} />
              </div>
              <h3 className="font-bold text-xl sm:text-2xl">{title}</h3>
              <p className="text-white/60 mt-4 leading-7">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
        <div className="rounded-[2rem] bg-white/[0.07] border border-white/10 p-6 sm:p-10 lg:p-12">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
            <div>
              <p className="text-blue-300 font-semibold mb-3">Process</p>
              <h2 className="text-3xl sm:text-5xl font-bold">How it works</h2>
            </div>
            <p className="text-white/60 max-w-xl leading-7">
              Drive Vault keeps the workflow simple: authenticate, prepare your
              vault, manage files, and track activity.
            </p>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
            {steps.map(({ number, title, desc, icon: Icon }) => (
              <div
                key={number}
                className="relative rounded-3xl bg-black/20 border border-white/10 p-6 overflow-hidden"
              >
                <div className="absolute right-5 top-5 text-5xl font-bold text-white/[0.04]">
                  {number}
                </div>

                <div className="h-12 w-12 rounded-2xl bg-blue-500/15 border border-blue-400/20 flex items-center justify-center text-blue-300 mb-6">
                  <Icon size={24} />
                </div>

                <p className="text-blue-300 text-sm font-bold">{number}</p>
                <h3 className="font-bold text-xl mt-3">{title}</h3>
                <p className="text-white/55 mt-3 leading-7">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="security" className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div>
            <p className="text-blue-300 font-semibold mb-3">Security</p>
            <h2 className="text-3xl sm:text-5xl font-bold leading-tight">
              Built around your own Drive and your own access.
            </h2>
            <p className="text-white/60 mt-6 text-base sm:text-lg leading-8">
              Your files remain inside Google Drive. Drive Vault adds a
              controlled dashboard, activity logs, storage visibility, and
              protected access flow on top.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/login"
                className="rounded-2xl bg-blue-600 px-6 py-4 text-center font-bold hover:bg-blue-700 transition"
              >
                Login securely
              </Link>
              <Link
                href="/reset-password"
                className="rounded-2xl border border-white/15 px-6 py-4 text-center font-bold hover:bg-white/10 transition"
              >
                Reset access
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            {securityItems.map(({ title, desc, icon: Icon }) => (
              <div
                key={title}
                className="rounded-3xl bg-white/[0.07] border border-white/10 p-5 sm:p-6 flex gap-4 hover:bg-white/[0.1] transition"
              >
                <div className="h-12 w-12 shrink-0 rounded-2xl bg-blue-500/15 border border-blue-400/20 flex items-center justify-center text-blue-300">
                  <Icon size={24} />
                </div>

                <div>
                  <h3 className="font-bold text-lg">{title}</h3>
                  <p className="text-white/55 mt-2 leading-7">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 py-16 sm:py-24">
        <div className="relative overflow-hidden rounded-[2rem] bg-blue-600 p-8 sm:p-12 lg:p-16 text-center shadow-2xl shadow-blue-600/20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.24),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.16),transparent_30%)]" />

          <div className="relative">
            <h2 className="text-3xl sm:text-5xl font-bold">
              Ready to open your vault?
            </h2>
            <p className="text-blue-100 mt-4 max-w-xl mx-auto leading-7">
              Login and start managing your private file space with a clean,
              secure dashboard.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
              <Link
                href="/login"
                className="rounded-2xl bg-white text-blue-700 px-8 py-4 font-bold hover:bg-blue-50 transition"
              >
                Continue
              </Link>
              <Link
                href="/reset-password"
                className="rounded-2xl border border-white/30 px-8 py-4 font-bold hover:bg-white/10 transition"
              >
                Reset Password
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-white/45 text-sm">
          <p>Drive Vault © 2026</p>
          <div className="flex items-center gap-5">
            <a href="#features" className="hover:text-white transition">
              Features
            </a>
            <a href="#how" className="hover:text-white transition">
              How it works
            </a>
            <a href="#security" className="hover:text-white transition">
              Security
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}