// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = { title: "Revboard", description: "Login" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <AuthSessionProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}