import "./globals.css";
import type { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de" className="dark">
      <body className="min-h-dvh bg-background text-foreground antialiased">
        {/* Falls du Header/Sidebar hast, lass die hier unverändert */}
        
          {/* ⬇️ Neu: zentriert + max. Breite + Seiten-Padding */}
          <div className="mx-auto w-full max-w-screen-2xl px-4 lg:px-6">
            {children}
          </div>
        
        {/* Footer falls vorhanden */}
      </body>
    </html>
  );
}
