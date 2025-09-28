import type { ReactNode } from "react";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { AppShell } from "@/components/sidebar";
import { ToastProvider } from "@/components/ui/toast";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de" className="dark">
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <AuthSessionProvider>
          {/* ToastProvider erwartet children → wir wrappen AppShell */}
          <ToastProvider>
            {/* Full-bleed Shell (Sidebar links bleibt vollbreit) */}
            <AppShell>
              {/* Nur den eigentlichen Seiteninhalt begrenzen & zentrieren */}
              <div className="mx-auto w-full max-w-screen-2xl px-4 lg:px-6 py-6">
                {children}
              </div>
            </AppShell>
          </ToastProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
