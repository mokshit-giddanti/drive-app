import DashboardShell from "@/components/dashboard/DashboardShell";
import { ToastProvider } from "@/components/ui/ToastProvider";

export default function DashboardLayout({ children }) {
  return (
    <ToastProvider>
      <DashboardShell>{children}</DashboardShell>
    </ToastProvider>
  );
}