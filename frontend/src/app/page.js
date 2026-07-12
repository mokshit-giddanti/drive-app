// // import Image from "next/image";

// // export default function Home() {
// //   return (
// //     <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
// //       <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
// //         <Image
// //           className="dark:invert"
// //           src="/next.svg"
// //           alt="Next.js logo"
// //           width={100}
// //           height={20}
// //           priority
// //         />
// //         <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
// //           <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
// //             To get started, edit the page.js file.
// //           </h1>
// //           <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
// //             Looking for a starting point or more instructions? Head over to{" "}
// //             <a
// //               href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
// //               className="font-medium text-zinc-950 dark:text-zinc-50"
// //             >
// //               Templates
// //             </a>{" "}
// //             or the{" "}
// //             <a
// //               href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
// //               className="font-medium text-zinc-950 dark:text-zinc-50"
// //             >
// //               Learning
// //             </a>{" "}
// //             center.
// //           </p>
// //         </div>
// //         <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
// //           <a
// //             className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
// //             href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
// //             target="_blank"
// //             rel="noopener noreferrer"
// //           >
// //             <Image
// //               className="dark:invert"
// //               src="/vercel.svg"
// //               alt="Vercel logomark"
// //               width={16}
// //               height={16}
// //             />
// //             Deploy Now
// //           </a>
// //           <a
// //             className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
// //             href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
// //             target="_blank"
// //             rel="noopener noreferrer"
// //           >
// //             Documentation
// //           </a>
// //         </div>
// //       </main>
// //     </div>
// //   );
// // }
// "use client";

// import { useState } from "react";
// import axios from "axios";

// const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

// export default function Home() {
//   const [email, setEmail] = useState("backendusr@gmail.com");
//   const [password, setPassword] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [message, setMessage] = useState("");

//   const handlePasswordLogin = async (e) => {
//     e.preventDefault();

//     try {
//       setLoading(true);
//       setMessage("");

//       const response = await axios.post(`${BACKEND_URL}/api/auth/login`, {
//         email,
//         password,
//       });

//       const data = response.data;

//       localStorage.setItem("drive_app_token", data.token);
//       localStorage.setItem("drive_app_user", JSON.stringify(data.user));

//       setMessage("Login successful. Redirecting...");

//       window.location.href = "/dashboard";
//     } catch (error) {
//       const errorMessage =
//         error.response?.data?.message || "Login failed. Please try again.";

//       setMessage(errorMessage);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleGoogleLogin = () => {
//     window.location.href = `${BACKEND_URL}/api/auth/google`;
//   };

//   return (
//     <main className="min-h-screen bg-[#0B1020] text-white flex items-center justify-center px-6">
//       <div className="w-full max-w-md">
//         <div className="bg-white/10 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur">
//           <div className="mb-8 text-center">
//             <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-blue-500 flex items-center justify-center text-2xl font-bold">
//               D
//             </div>

//             <h1 className="text-3xl font-bold">Drive Vault</h1>

//             <p className="text-white/60 mt-2">
//               Login to manage your private Google Drive vault.
//             </p>
//           </div>

//           <button
//             onClick={handleGoogleLogin}
//             className="w-full rounded-xl bg-white text-black py-3 font-semibold hover:bg-gray-100 transition"
//           >
//             Continue with Google
//           </button>

//           <div className="flex items-center gap-3 my-6">
//             <div className="h-px flex-1 bg-white/10" />
//             <span className="text-white/40 text-sm">or</span>
//             <div className="h-px flex-1 bg-white/10" />
//           </div>

//           <form onSubmit={handlePasswordLogin} className="space-y-4">
//             <div>
//               <label className="block text-sm text-white/70 mb-2">Email</label>
//               <input
//                 type="email"
//                 className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 outline-none focus:border-blue-500"
//                 value={email}
//                 onChange={(e) => setEmail(e.target.value)}
//                 placeholder="Enter email"
//               />
//             </div>

//             <div>
//               <label className="block text-sm text-white/70 mb-2">
//                 Password
//               </label>
//               <input
//                 type="password"
//                 className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 outline-none focus:border-blue-500"
//                 value={password}
//                 onChange={(e) => setPassword(e.target.value)}
//                 placeholder="Enter password"
//               />
//             </div>

//             <button
//               type="submit"
//               disabled={loading}
//               className="w-full rounded-xl bg-blue-600 py-3 font-semibold hover:bg-blue-700 transition disabled:opacity-60"
//             >
//               {loading ? "Logging in..." : "Login"}
//             </button>
//           </form>

//           {message && (
//             <div className="mt-5 rounded-xl bg-black/30 border border-white/10 p-3 text-sm text-white/80">
//               {message}
//             </div>
//           )}
//         </div>
//       </div>
//     </main>
//   );
// }
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <nav className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-blue-500 flex items-center justify-center font-bold text-xl">
            D
          </div>
          <span className="text-xl font-bold">Drive Vault</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm text-white/70">
          <a href="#features" className="hover:text-white">
            Features
          </a>
          <a href="#how" className="hover:text-white">
            How it works
          </a>
          <a href="#security" className="hover:text-white">
            Security
          </a>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/10"
          >
            Login
          </Link>

          <Link
            href="/login"
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-700"
          >
            Get Started
          </Link>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-6 pt-16 pb-24 grid lg:grid-cols-2 gap-14 items-center">
        <div>
          <div className="inline-flex rounded-full border border-blue-400/30 bg-blue-400/10 px-4 py-2 text-sm text-blue-200 mb-6">
            Personal Google Drive file vault
          </div>

          <h1 className="text-5xl md:text-6xl font-bold leading-tight">
            Manage your files with clarity, control, and privacy.
          </h1>

          <p className="text-white/65 text-lg mt-6 max-w-xl">
            Drive Vault is a personal file management layer built on top of your
            Google Drive. Upload, organize, download, monitor storage, and track
            every activity from one clean dashboard.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mt-9">
            <Link
              href="/login"
              className="rounded-2xl bg-blue-600 px-7 py-4 text-center font-semibold hover:bg-blue-700"
            >
              Start Managing Files
            </Link>

            <Link
              href="/reset-password"
              className="rounded-2xl border border-white/15 px-7 py-4 text-center font-semibold hover:bg-white/10"
            >
              Reset Password
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-8 bg-blue-500/20 blur-3xl rounded-full" />

          <div className="relative rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur">
            <div className="rounded-2xl bg-[#0b1020] border border-white/10 p-5">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <p className="text-white/50 text-sm">Private Vault</p>
                  <h3 className="text-2xl font-bold">Dashboard Preview</h3>
                </div>
                <div className="h-11 w-11 rounded-full bg-blue-500" />
              </div>

              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-white/40 text-xs">Files</p>
                  <p className="text-2xl font-bold mt-2">128</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-white/40 text-xs">Folders</p>
                  <p className="text-2xl font-bold mt-2">16</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-white/40 text-xs">Storage</p>
                  <p className="text-2xl font-bold mt-2">0.7%</p>
                </div>
              </div>

              <div className="rounded-2xl bg-white/10 p-4 mb-4">
                <div className="flex justify-between text-sm mb-3">
                  <span>Storage usage</span>
                  <span className="text-blue-300">15 GB</span>
                </div>
                <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full w-[18%] bg-blue-500 rounded-full" />
                </div>
              </div>

              <div className="space-y-3">
                {[
                  "Uploaded project-report.pdf",
                  "Created folder Documents",
                  "Downloaded invoice.json",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white/70"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-4xl font-bold">Everything your vault needs</h2>
          <p className="text-white/60 mt-3">
            A clean dashboard for files, folders, logs, and storage visibility.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {[
            ["Google Drive Powered", "Files stay inside your own Drive space."],
            ["File Management", "Upload, download, rename, and delete files."],
            ["Folder Control", "Create folders and organize content cleanly."],
            ["Activity Logs", "Track uploads, downloads, renames, and deletes."],
            ["Storage Alerts", "Monitor usage and threshold alerts."],
            ["Private Access", "Protected using Google login and JWT sessions."],
          ].map(([title, desc]) => (
            <div
              key={title}
              className="rounded-3xl bg-white/8 border border-white/10 p-6 hover:bg-white/12 transition"
            >
              <div className="h-12 w-12 rounded-2xl bg-blue-500/20 border border-blue-400/20 mb-5" />
              <h3 className="font-bold text-xl">{title}</h3>
              <p className="text-white/60 mt-3">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="max-w-7xl mx-auto px-6 py-20">
        <div className="rounded-3xl bg-white/8 border border-white/10 p-8 md:p-12">
          <h2 className="text-4xl font-bold mb-10">How it works</h2>

          <div className="grid md:grid-cols-4 gap-5">
            {[
              ["01", "Login securely", "Connect with Google and verify access."],
              ["02", "Vault setup", "Folders are created automatically."],
              ["03", "Manage files", "Upload and organize files easily."],
              ["04", "Track everything", "Review logs and monitor storage."],
            ].map(([num, title, desc]) => (
              <div key={num} className="rounded-2xl bg-black/20 p-5">
                <p className="text-blue-300 font-bold">{num}</p>
                <h3 className="font-bold text-lg mt-3">{title}</h3>
                <p className="text-white/55 mt-2">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="security" className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-4xl font-bold">Built around your own Drive</h2>
            <p className="text-white/60 mt-5 text-lg">
              Your files are stored in your Google Drive. Drive Vault provides a
              controlled dashboard, activity logs, storage visibility, and
              secure access flow.
            </p>
          </div>

          <div className="grid gap-4">
            {[
              "Google-authenticated access",
              "Private vault folder structure",
              "Activity tracking for every operation",
              "Storage usage and alert monitoring",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl bg-white/8 border border-white/10 p-5"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="rounded-3xl bg-blue-600 p-10 md:p-14 text-center">
          <h2 className="text-4xl font-bold">Ready to open your vault?</h2>
          <p className="text-blue-100 mt-4">
            Login and start managing your private file space.
          </p>

          <Link
            href="/login"
            className="inline-block mt-8 rounded-2xl bg-white text-blue-700 px-7 py-4 font-bold hover:bg-blue-50"
          >
            Continue
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-white/40">
        Drive Vault © 2026
      </footer>
    </main>
  );
}