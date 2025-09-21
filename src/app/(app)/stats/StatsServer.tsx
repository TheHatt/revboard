// src/app/(app)/stats/StatsServer.tsx
import { getStats, type StatsQuery, type StatsDTO } from "@/lib/stats";
import StatsClient from "./StatsClient";

export type StatsFilters = {
  range?: StatsQuery["range"] | null;
  locationId?: string | null;
};

type Props = {
  tenantId: string;
  allowedLocationIds: string[];
  filters: StatsFilters;
};

export default async function StatsServer({ tenantId, allowedLocationIds, filters }: Props) {
  const q: StatsQuery = {
    range: filters.range ?? "30 Tage",
    locationId: filters.locationId ?? undefined,
  };

  const stats: StatsDTO = await getStats(tenantId, allowedLocationIds, q);
  return <StatsClient stats={stats} filters={filters} />;
}
