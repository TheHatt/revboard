// src/app/(app)/stats/page.tsx
import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantAndLocationsForUser } from "@/lib/tenancy";
import FilterBarStats from "./FilterBarStats";
import StatsSkeleton from "./StatsSkeleton";
import StatsServer from "./StatsServer";
import type { StatsQuery } from "@/lib/stats";
import { prisma } from "@/lib/prisma";

export type StatsFilters = {
  range?: StatsQuery["range"] | null;
  locationId?: string | null;
};

function parseFilters(sp: Record<string, string | string[] | undefined>): StatsFilters {
  const raw = (k: string) => (Array.isArray(sp[k]) ? (sp[k] as string[])[0] : sp[k]) ?? null;
  const loc = raw("location");
  return {
    range: (raw("range") as StatsFilters["range"]) ?? "30 Tage",
    locationId: loc === "all" ? null : loc, // "all" neutralisieren
  };
}

export default async function StatsPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const filters = parseFilters(searchParams);

  const session = await getServerSession(authOptions);
  
  const user = session?.user as any;
  if (!user?.id) throw new Error("Keine Session oder user.id – bitte einloggen.");

  const tenantId = user.tenantId as string;
  const allowedLocationIds = (user.locationIds ?? []) as string[];

// Namen frisch aus DB (immer aktuell)

  const locations = await prisma.location.findMany({
    where: { tenantId, ...(allowedLocationIds.length ? { id: { in: allowedLocationIds } } : {}) },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const uiLocationOptions = [{ id: "all", label: "Alle Standorte" }, ...locations.map(l => ({ id: l.id, label: l.name }))];


  return (
    <main className="flex flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Statistiken</h1>
      </header>

      <FilterBarStats
        initialRange={filters.range ?? undefined}
        initialLocationId={filters.locationId ?? undefined}
        locationOptions={uiLocationOptions}
      />

      <Suspense fallback={<StatsSkeleton />}>
        <StatsServer tenantId={tenantId} allowedLocationIds={allowedLocationIds} filters={filters} />
      </Suspense>
    </main>
  );
}
