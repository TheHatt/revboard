"use client";

import React, { useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import {
  Menu,
  X,
  LayoutDashboard,
  MessageSquare,
  BarChart3,
  Settings,
  HelpCircle,
  User,
  LogOut,
} from "lucide-react";

/**
 * Sidebar + App Shell for Next.js + Tailwind
 * -------------------------------------------------
 * • Drop the <Sidebar/> and <AppShell/> into your Next.js project.
 * • Replace <a> with `next/link` <Link> if desired.
 * • Active-state uses `window.location.pathname` for this preview.
 *   In Next.js, swap usePathname (next/navigation).
 */

// Types
 type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  beta?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Reviews", href: "/reviews", icon: MessageSquare },
  { label: "Statistiken", href: "/stats", icon: BarChart3 },
  { label: "Einstellungen", href: "/settings", icon: Settings },
  { label: "Support", href: "/support", icon: HelpCircle },
];

function classNames(...cls: (string | false | undefined)[]) {
  return cls.filter(Boolean).join(" ");
}

function usePath() {
  // Safe for non-Next preview; in Next.js prefer: const pathname = usePathname();
  const [pathname, setPathname] = useState<string>("/");
  React.useEffect(() => {
    if (typeof window !== "undefined") setPathname(window.location.pathname || "/");
  }, []);
  return pathname;
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePath();
  const { data } = useSession();
  const user = data?.user as any;

  return (
    <aside className="h-full w-72 shrink-0 border-r bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-neutral-900/60 dark:border-neutral-800">
      <div className="flex h-16 items-center gap-2 px-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white dark:bg-white dark:text-black">
          <span className="font-bold">GR</span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold">ReviewBoard</span>
          <span className="text-xs text-neutral-500">by Erich</span>
        </div>
      </div>
      <nav className="px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <a
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={classNames(
                "group mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                active
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-black"
                  : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              )}
            >
              <Icon className={classNames("h-4 w-4", active && "opacity-90")} />
              <span className="flex-1">{item.label}</span>
              {item.beta && (
                <span className="rounded-md bg-neutral-900 px-1.5 py-0.5 text-[10px] font-medium text-white dark:bg-white dark:text-black">
                  BETA
                </span>
              )}
            </a>
          );
        })}
      </nav>
      <div className="mt-auto p-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{user?.name ?? "Account"}</div>
          <div className="truncate text-xs text-neutral-500">
            {user?.tenantId ?? "—"} · {user?.role ?? "—"}
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-2 rounded-lg border px-2 py-1 text-xs hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}

function cx(...c: (string | false | undefined)[]) { return c.filter(Boolean).join(" "); }


export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 antialiased dark:bg-black dark:text-neutral-100">
      {/* Mobile Toggle (floating) */}
      <button
        className="fixed left-4 top-4 z-[60] rounded-xl p-2 shadow md:hidden
                   bg-white/90 backdrop-blur border dark:bg-neutral-900 dark:border-neutral-800"
        aria-label="Menü öffnen"
        onClick={() => setOpen(v => !v)}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Layout */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 md:grid-cols-[18rem_1fr]">
        {/* Sidebar / Drawer */}
        <div
          className={cx(
            "fixed inset-y-0 left-0 z-50 w-72 -translate-x-full border-r bg-white transition-transform duration-200 ease-out",
            "dark:border-neutral-800 dark:bg-neutral-950 md:static md:translate-x-0",
            open && "translate-x-0"
          )}
          onClick={() => setOpen(false)}
        >
          <Sidebar onNavigate={() => setOpen(false)} />
        </div>

        {/* Main */}
        <main className="min-h-screen p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

// --- Demo Preview Component ---
// This default export allows the canvas to render the shell.
// Replace with your routes/pages in Next.js.
export default function Demo() {
  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Willkommen 👋</h1>
        <p className="max-w-prose text-sm text-neutral-600 dark:text-neutral-400">
          Navigationsgerüst steht. Als nächstes: <b>Reviews-Liste</b> einhängen. Unten findest du
          ein paar Beispielkarten für die Startseite.
        </p>

        <section className="grid gap-4 md:grid-cols-3">
          {["Heute", "Diese Woche", "Diesen Monat"].map((label, i) => (
            <div key={label} className="rounded-2xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
              <div className="text-xs text-neutral-500">Neue Rezensionen — {label}</div>
              <div className="mt-2 text-3xl font-bold">{[3, 17, 64][i]}</div>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
          <h2 className="mb-2 text-base font-semibold">Zuletzt eingetroffen</h2>
          <ul className="divide-y text-sm dark:divide-neutral-800">
            {[1, 2, 3].map((n) => (
              <li key={n} className="flex items-start gap-3 py-3">
                <div className="mt-1 grid h-8 w-8 place-items-center rounded-full bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Max M.</span>
                    <span className="text-xs text-neutral-500">vor {n} Std.</span>
                  </div>
                  <p className="text-neutral-700 dark:text-neutral-300">Super schneller Termin, freundliches Team. Danke!</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
