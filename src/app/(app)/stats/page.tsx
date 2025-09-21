// src/app/(app)/stats/page.tsx
import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantAndLocationsForUser } from "@/lib/tenancy";
import FilterBarStats from "./FilterBarStats";
import StatsSkeleton from "./StatsSkeleton";
import StatsServer from "./StatsServer";
import type { StatsQuery } from "@/lib/stats";

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
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) throw new Error("Keine Session oder user.id – bitte einloggen.");

  const { tenantId, allowedLocationIds, locationOptions } = await getTenantAndLocationsForUser(userId);
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

      <Suspense fallback={<StatsSkeleton />}>
        <StatsServer tenantId={tenantId} allowedLocationIds={allowedLocationIds} filters={filters} />
      </Suspense>
    </main>
  );
}
