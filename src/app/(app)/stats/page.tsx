// src/app/(app)/stats/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStats, type StatsQuery } from "@/lib/stats";
import StatsClient from "./StatsClient";
import FilterBarStats from "./FilterBarStats";
import { redirect } from "next/navigation";

type SPRecord = Record<string, string | string[] | undefined>;
type SP = URLSearchParams | SPRecord;

// Robust für URLSearchParams ODER Record
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

  // Default jetzt "vollständig", damit sofort Daten sichtbar sind
  const range = (getVal("range") as StatsQuery["range"]) ?? "vollständig";
  const loc = getVal("location"); // "alle" | <locationId>
  return {
    range,
    locationId: !loc || loc === "alle" || loc === "all" ? undefined : (loc as string),
  };
}

export default async function Page({
  searchParams,
}: {
  // Next 15: Promise<URLSearchParams>, ältere Setups reichen auch ein Record
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
  const stats = await getStats(tenantId, allowedLocationIds, {
    range: f.range,
    locationId: validLocationId,
  });

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
