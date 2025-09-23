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
    unansweredCount: number;    // NEU
    responseTimeP50: number | null; // NEU, Sekunden (oder null, wenn keine Antworten)
    byDay: Array<{ date: string; count: number }>;
    byStars: Array<{ stars: number; count: number }>;
  };

/**
 * Aggregiert Kennzahlen + Chart-Daten.
 * - Respektiert tenantId & allowedLocationIds.
 * - Optionaler locationId-Filter (setzt sich obendrauf).
 */
// src/lib/stats.ts
export async function getStats(
    tenantId: string,
    allowedLocationIds: string[] | undefined,
    q: StatsQuery
  ): Promise<StatsDTO> {
    const dateRange = buildDateRange(q.range);
  
    const where: any = { tenantId };
    if (dateRange.gte || dateRange.lte) where.publishedAt = dateRange;
  
    if (q.locationId) {
      if (allowedLocationIds?.length && !allowedLocationIds.includes(q.locationId)) {
        return emptyStats();
      }
      where.locationId = q.locationId;
    } else if (allowedLocationIds?.length) {
      where.locationId = { in: allowedLocationIds };
    }
  
    // Parallel: total, answered, avg, stars, veröffentlichungs-Tage, Antwortzeiten
    const [total, answered, avgAgg, byStarsRaw, publishedRows, answeredRows] = await Promise.all([
      prisma.review.count({ where }),
      prisma.review.count({ where: { ...where, answeredAt: { not: null } } }),
      prisma.review.aggregate({ where, _avg: { rating: true } }),
      prisma.review.groupBy({ where, by: ["rating"], _count: { _all: true } }),
      prisma.review.findMany({ where, select: { publishedAt: true } }),
      prisma.review.findMany({
        where: { ...where, answeredAt: { not: null } },
        select: { publishedAt: true, answeredAt: true },
      }),
    ]);
  
    // byDay
    const dayCounts = new Map<string, number>();
    for (const r of publishedRows) {
      const d = r.publishedAt.toISOString().slice(0, 10);
      dayCounts.set(d, (dayCounts.get(d) ?? 0) + 1);
    }
    const byDay = Array.from(dayCounts.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, count]) => ({ date, count }));
  
    // byStars
    const starsMap = new Map<number, number>();
    for (const row of byStarsRaw) starsMap.set(row.rating, row._count._all);
    const byStars = [5, 4, 3, 2, 1].map((stars) => ({ stars, count: starsMap.get(stars) ?? 0 }));
  
    const avgRating = avgAgg._avg.rating ? Number(avgAgg._avg.rating.toFixed(2)) : 0;
    const replyRate = total > 0 ? answered / total : 0;
    const unansweredCount = total - answered;
  
    // Median Antwortzeit (in Sekunden)
    let responseTimeP50: number | null = null;
    if (answeredRows.length > 0) {
      const seconds: number[] = [];
      for (const r of answeredRows) {
        if (r.answeredAt && r.publishedAt) {
          const diffMs = r.answeredAt.getTime() - r.publishedAt.getTime();
          if (diffMs >= 0) seconds.push(Math.round(diffMs / 1000));
        }
      }
      if (seconds.length > 0) {
        seconds.sort((a, b) => a - b);
        const mid = Math.floor(seconds.length / 2);
        responseTimeP50 = seconds.length % 2 === 0
          ? Math.round((seconds[mid - 1] + seconds[mid]) / 2)
          : seconds[mid];
      }
    }
  
    return {
      totalReviews: total,
      avgRating,
      replyRate,
      unansweredCount,
      responseTimeP50,
      byDay,
      byStars,
    };
  }
  
  function emptyStats(): StatsDTO {
    return {
      totalReviews: 0,
      avgRating: 0,
      replyRate: 0,
      unansweredCount: 0,
      responseTimeP50: null,
      byDay: [],
      byStars: [5, 4, 3, 2, 1].map((stars) => ({ stars, count: 0 })),
    };
  }
