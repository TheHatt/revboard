import { prisma } from "@/lib/prisma";
import { buildDateRange } from "@/lib/dateRange";


/** Eingabe wie in der Liste, aber Location per ID (robuster als Name) */
export type StatsQuery = {
  range?: "vollständig" | "heute" | "7 Tage" | "30 Tage";
  locationId?: string;                 // optional; wenn gesetzt, überschreibt allowedLocationIds-Einschränkung
};




export type StatsDTO = {
  totalReviews: number;
  avgRating: number;          // 0..5 (0 wenn keine Daten)
  replyRate: number;          // 0..1  (0 wenn keine Daten)
  byDay: Array<{ date: string; count: number }>;   // date = "YYYY-MM-DD"
  byStars: Array<{ stars: number; count: number }>; // stars = 1..5 (fehlende -> 0)
};

/**
 * Aggregiert Kennzahlen + Chart-Daten.
 * - Respektiert tenantId & allowedLocationIds.
 * - Optionaler locationId-Filter (setzt sich obendrauf).
 */
export async function getStats(
  tenantId: string,
  allowedLocationIds: string[] | undefined,
  q: StatsQuery
): Promise<StatsDTO> {
  const dateRange = buildDateRange(q.range);

  // Basis-Filter
  const where: any = { tenantId };
  if (dateRange.gte || dateRange.lte) where.publishedAt = dateRange;

  // Location-Scope (allowedLocationIds) + optionaler harter Location-Filter
  if (q.locationId) {
    // Wenn explizite Location gesetzt ist, prüfe Intersection mit Scope:
    if (allowedLocationIds?.length && !allowedLocationIds.includes(q.locationId)) {
      // außerhalb des Scopes → leeres Ergebnis
      return emptyStats();
    }
    where.locationId = q.locationId;
  } else if (allowedLocationIds?.length) {
    where.locationId = { in: allowedLocationIds };
  }

  // Parallel abfragen
  const [total, answered, avgAgg, byStarsRaw, publishedRows] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.count({ where: { ...where, answeredAt: { not: null } } }),
    prisma.review.aggregate({ where, _avg: { rating: true } }),
    prisma.review.groupBy({ where, by: ["rating"], _count: { _all: true } }),
    prisma.review.findMany({ where, select: { publishedAt: true } }),
  ]);

  // byDay (auf Tag runden)
  const dayCounts = new Map<string, number>();
  for (const r of publishedRows) {
    const d = r.publishedAt.toISOString().slice(0, 10); // "YYYY-MM-DD"
    dayCounts.set(d, (dayCounts.get(d) ?? 0) + 1);
  }
  const byDay = Array.from(dayCounts.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, count]) => ({ date, count }));

  // byStars (1..5, fehlende als 0 auffüllen)
  const starsMap = new Map<number, number>();
  for (const row of byStarsRaw) starsMap.set(row.rating, row._count._all);
  const byStars = [5, 4, 3, 2, 1].map((stars) => ({ stars, count: starsMap.get(stars) ?? 0 }));

  const avgRating = avgAgg._avg.rating ? Number(avgAgg._avg.rating.toFixed(2)) : 0;
  const replyRate = total > 0 ? answered / total : 0;

  return {
    totalReviews: total,
    avgRating,
    replyRate,
    byDay,
    byStars,
  };
}

function emptyStats(): StatsDTO {
  return {
    totalReviews: 0,
    avgRating: 0,
    replyRate: 0,
    byDay: [],
    byStars: [5, 4, 3, 2, 1].map((stars) => ({ stars, count: 0 })),
  };
}
