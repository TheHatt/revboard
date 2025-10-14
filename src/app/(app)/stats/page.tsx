// src/app/(app)/stats/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStats, type StatsQuery } from "@/lib/stats";
import StatsClient from "./StatsClient";
import FilterBarStats from "./FilterBarStats";
import { redirect } from "next/navigation";

type SPRecord = Record<string, string | string[] | undefined>;
type SP = URLSearchParams | SPRecord;

/**
 * Robust für URLSearchParams ODER Record.
 * - Wenn from/to vorhanden sind, haben sie Vorrang und wir ignorieren range (=> "vollständig")
 * - locationId: "alle"/"all" => undefined
 */
function normalize(sp: SP) {
  const isSearchParams = typeof (sp as any)?.get === "function";

  const getVal = (key: string): string | null => {
    if (isSearchParams) {
      const v = (sp as URLSearchParams).get(key);
      return v === null ? null : v;
    }
    const rec = sp as SPRecord;
    const raw = rec[key];
    if (Array.isArray(raw)) return raw[0] ?? null;
    return (raw as string | undefined) ?? null;
  };

  const from = getVal("from");
  const to = getVal("to");
  const hasFromTo = !!(from && to);

  const range =
    hasFromTo
      ? ("vollständig" as const)
      : ((getVal("range") as StatsQuery["range"]) ?? "30 Tage");

  const loc = getVal("location"); // "alle" | <locationId>

  return {
    range,
    from: hasFromTo ? from : null,
    to: hasFromTo ? to : null,
    locationId: !loc || loc === "alle" || loc === "all" ? undefined : (loc as string),
  };
}

export default async function Page({
  searchParams,
}: {
  // Next 15: Promise<URLSearchParams>, ältere Setups auch als Record möglich
  searchParams: Promise<SP>;
}) {
  // --- Session / Tenancy ---
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user?.tenantId) {
    redirect("/");
  }

  const tenantId = user.tenantId;
  const allowedLocationIds =
    Array.isArray(user.locationIds) && user.locationIds.length > 0
      ? user.locationIds
      : undefined;

  // --- Locations laden (Name + ID) ---
  const locs = await prisma.location.findMany({
    where: {
      tenantId,
      ...(allowedLocationIds ? { id: { in: allowedLocationIds } } : {}),
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const locationOptions: { id: string; label: string }[] = [
    { id: "alle", label: "Alle Standorte" },
    ...locs.map((l) => ({ id: l.id, label: l.name })),
  ];

  // --- URL lesen & normalisieren ---
  const sp = await searchParams;
  const f = normalize(sp);

  // Debug: was kommt aus der URL wirklich an?
  if (process.env.NODE_ENV !== "production") {
    // sp kann URLSearchParams ODER Record sein
    const debugObj =
      typeof (sp as any)?.entries === "function"
        ? Object.fromEntries((sp as URLSearchParams).entries())
        : sp;
    console.debug("[stats/page] URL params", debugObj);
  }

  // Nur zulässige locationId durchlassen
  const validLocationId =
    f.locationId && locs.some((l) => l.id === f.locationId) ? f.locationId : undefined;

  // --- DEV: kleiner Mismatch-Check (nur Konsole) ---
  if (process.env.NODE_ENV !== "production") {
    const [countForSessionTenant, allByTenant] = await Promise.all([
      prisma.review.count({ where: { tenantId } }),
      prisma.review.groupBy({ by: ["tenantId"], _count: { _all: true } }),
    ]);
    console.log("[stats] session.tenantId =", tenantId, "count =", countForSessionTenant);
    console.log("[stats] reviews by tenant =", allByTenant);
  }

  // --- Stats ziehen ---
  // Hinweis: Falls dein aktuelles StatsQuery noch keine from/to kennt,
  // geben wir sie per Spread + `as any` weiter, damit TS nicht meckert.
  const stats = await getStats(
    tenantId,
    allowedLocationIds,
    {
      range: f.range,
      locationId: validLocationId,
      ...(f.from && f.to ? { from: f.from, to: f.to } : {}),
    } as any
  );

  return (
    <main className="flex flex-col gap-6">
      <header>
        <FilterBarStats
          initialRange={f.range}
          initialLocationId={validLocationId}
          locationOptions={locationOptions}
        />
      </header>

      <section>
        <StatsClient
          stats={stats}
          // StatsClient erwartet locationId?: string | null
          filters={{ range: f.range, locationId: validLocationId ?? null }}
        />
      </section>
    </main>
  );
}
