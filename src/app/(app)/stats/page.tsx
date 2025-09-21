// src/app/(app)/stats/page.tsx
import { Suspense } from "react";
import StatsClient from "./StatsClient";
import FilterBarStats from "./FilterBarStats";
import { getStats, type StatsQuery } from "@/lib/stats";
import { getServerSession } from "next-auth";
import { auth, authOptions } from "@/lib/auth";                 // <- an dein Projekt anpassen
import { getTenantAndLocationsForUser } from "@/lib/tenancy";

export type StatsFilters = {
  range?: StatsQuery["range"] | null;                     // "heute" | "7 Tage" | "30 Tage" | "vollständig"
  locationId?: string | null;
};

function parseFilters(sp: Record<string, string | string[] | undefined>): StatsFilters {
  const raw = (k: string) => (Array.isArray(sp[k]) ? (sp[k] as string[])[0] : sp[k]) ?? null;
  const loc = raw("location");
  return {
    range: (raw("range") as StatsFilters["range"]) ?? "30 Tage",
    locationId: loc === "all" ? null : loc,               // 👈 "all" neutralisieren
  };
}

export default async function StatsPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const filters = parseFilters(searchParams);

  // Session → Tenancy
  const session = await auth();
  const userId = session!.user.id;
  const { tenantId, allowedLocationIds, locationOptions } =
    await getTenantAndLocationsForUser(userId);

  // Stats abrufen (range + optional locationId)
  const q: StatsQuery = {
    range: filters.range ?? "30 Tage",
    locationId: filters.locationId ?? undefined,           // "all" ist bereits neutralisiert
  };
  const stats = await getStats(tenantId, allowedLocationIds, q);

  const uiLocationOptions = [{ id: "all", label: "Alle Standorte" }, ...locationOptions];

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

      <Suspense>
        <StatsClient stats={stats} filters={filters} />
      </Suspense>
    </main>
  );
}
