import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { useRealtimeSync } from "@/hooks/useData";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  useRealtimeSync();
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-60 flex-1 p-6">{children}</main>
    </div>
  );
}
