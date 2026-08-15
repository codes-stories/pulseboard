import { AuthGate } from "../../components/auth-gate";
import { DashboardShell } from "../../components/dashboard-shell";
import type { ReactNode } from "react";

export default function DashboardLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <AuthGate>
      <DashboardShell>{children}</DashboardShell>
    </AuthGate>
  );
}
