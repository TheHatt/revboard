import type { ReactNode } from "react";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { AppShell } from "@/components/sidebar";
import { ToastProvider } from "@/components/ui/toast";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthSessionProvider>
      <ToastProvider>
        <AppShell>
          {/* Nur der Content wird begrenzt/zentriert */}
          <div className="mx-auto w-full max-w-screen-2xl px-4 lg:px-6">
            {children}
          </div>
        </AppShell>
      </ToastProvider>
    </AuthSessionProvider>
  );
}
