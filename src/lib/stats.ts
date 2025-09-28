// lib/stats.ts
import { prisma } from "@/lib/prisma";
import { buildDateRange } from "@/lib/dateRange";

/** Eingabe wie in der Liste, aber Location per ID (robuster als Name) */
export type StatsQuery = {
  range?: "vollständig" | "heute" | "7 Tage" | "30 Tage";
  locationId?: string;

  /** Optional: expliziter Zeitfilter (überschreibt range, wenn gesetzt) – ISO "YYYY-MM-DD" */
  from?: string | null;
  to?: string | null;

  /** Optional: Wochentagsfilter 0=So..6=Sa (nur für byWeekday-Drilldown relevant) */
  weekday?: number | null;
};

export type StatsDTO = {
  totalReviews: number;
  avgRating: number;              // 0..5
  replyRate: number;              // 0..1
  unansweredCount: number;
  responseTimeP50: number | null; // Sekunden
  byDay: Array<{ date: string; count: number }>;
  byStars: Array<{ stars: number; count: number }>;

  // bereits genutzt in deinen Charts
  byWeekday: Array<{ weekday: string; count: number }>;
  byLocationStars: Array<{ location: string; r1: number; r2: number; r3: number; r4: number; r5: number }>;

  // NEU
  byHour: Array<{ hour: number; count: number }>;
  byDayAvgRating?: Array<{ date: string; avg: number }>;

  // optional (wenn du SLA/Sparkline anzeigst)
  slaUnder24hRate?: number;       // 0..1
  responseTimeBuckets?: number[]; // z. B. [<1h, 1–6h, 6–24h, 1–3d, >3d]
};

export async function getStats(
  tenantId: string,
  allowedLocationIds: string[] | undefined,
  q: StatsQuery
): Promise<StatsDTO> {
  // ---- Zeitfenster bestimmen ----
  const where: any = { tenantId };

  if (q.from || q.to) {
    const gte = q.from ? startOfDayISO(q.from) : undefined;
    const lte = q.to ? endOfDayISO(q.to) : undefined;
    if (gte || lte) where.publishedAt = { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) };
  } else {
    const dr = buildDateRange(q.range);
    if (dr.gte || dr.lte) where.publishedAt = dr;
  }

  // Standort-Filter
  if (q.locationId) {
    if (allowedLocationIds?.length && !allowedLocationIds.includes(q.locationId)) {
      return emptyStats();
    }
    where.locationId = q.locationId;
  } else if (allowedLocationIds?.length) {
    where.locationId = { in: allowedLocationIds };
  }

  // ---- Parallel-Queries ----
  const [
    total,
    answered,
    avgAgg,
    byStarsRaw,
    // für byDay und byHour
    publishedRows,
    // für Antwortzeit (Median, SLA, Buckets)
    answeredRows,
    // für Ø-Rating pro Tag
    rowsWithRating,
    // für Location+Stars (gestapelt)
    locStarsAgg,
  ] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.count({ where: { ...where, answeredAt: { not: null } } }),
    prisma.review.aggregate({ where, _avg: { rating: true } }),
    prisma.review.groupBy({ where, by: ["rating"], _count: { _all: true } }),
    prisma.review.findMany({ where, select: { publishedAt: true } }),
    prisma.review.findMany({
      where: { ...where, answeredAt: { not: null } },
      select: { publishedAt: true, answeredAt: true },
    }),
    prisma.review.findMany({
      where,
      select: { publishedAt: true, rating: true },
    }),
    prisma.review.groupBy({
      by: ["locationId", "rating"],
      where,
      _count: { _all: true },
    }),
  ]);

  // ---- byDay (Anzahl/Tag) ----
  const dayCounts = new Map<string, number>();
  for (const r of publishedRows) {
    const d = toISODate(r.publishedAt);
    dayCounts.set(d, (dayCounts.get(d) ?? 0) + 1);
  }
  const byDay = Array.from(dayCounts.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, count]) => ({ date, count }));

  // ---- byStars (5..1) ----
  const starsMap = new Map<number, number>();
  for (const row of byStarsRaw) starsMap.set(row.rating, row._count._all);
  const byStars = [5, 4, 3, 2, 1].map((stars) => ({ stars, count: starsMap.get(stars) ?? 0 }));

  // ---- Kernkennzahlen ----
  const avgRating = avgAgg._avg.rating ? Number(avgAgg._avg.rating.toFixed(2)) : 0;
  const replyRate = total > 0 ? answered / total : 0;
  const unansweredCount = total - answered;

  // ---- Antwortzeit (Median, SLA, Buckets) ----
  let responseTimeP50: number | null = null;
  let slaUnder24hRate: number | undefined = undefined;
  let responseTimeBuckets: number[] | undefined = undefined;
  if (answeredRows.length > 0) {
    const secs: number[] = [];
    let slaOK = 0;
    for (const r of answeredRows) {
      if (r.answeredAt && r.publishedAt) {
        const s = Math.max(0, Math.round((r.answeredAt.getTime() - r.publishedAt.getTime()) / 1000));
        secs.push(s);
        if (s <= 24 * 3600) slaOK++;
      }
    }
    if (secs.length > 0) {
      secs.sort((a, b) => a - b);
      const mid = Math.floor(secs.length / 2);
      responseTimeP50 = secs.length % 2 === 0 ? Math.round((secs[mid - 1] + secs[mid]) / 2) : secs[mid];
      slaUnder24hRate = slaOK / secs.length;

      // Buckets: <1h, 1–6h, 6–24h, 1–3d, >3d
      const buckets = [0, 0, 0, 0, 0];
      for (const s of secs) {
        if (s < 3600) buckets[0]++;
        else if (s < 6 * 3600) buckets[1]++;
        else if (s < 24 * 3600) buckets[2]++;
        else if (s < 3 * 24 * 3600) buckets[3]++;
        else buckets[4]++;
      }
      responseTimeBuckets = buckets;
    }
  }

  // ---- byWeekday (0..6) mit optionalem Drilldown-Filter ----
  const WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  const weekdayCounts = new Map<number, number>();
  for (const r of publishedRows) {
    const wd = r.publishedAt.getDay();
    if (typeof q.weekday === "number" && q.weekday >= 0 && q.weekday <= 6) {
      if (wd !== q.weekday) continue;
    }
    weekdayCounts.set(wd, (weekdayCounts.get(wd) ?? 0) + 1);
  }
  const byWeekday = Array.from({ length: 7 }).map((_, i) => ({
    weekday: WEEKDAYS[i],
    count: weekdayCounts.get(i) ?? 0,
  }));

  // ---- byLocationStars (gestapelt je Standort) ----
  const locationIds = Array.from(new Set(locStarsAgg.map((r) => r.locationId)));
  const locations = locationIds.length
    ? await prisma.location.findMany({
        where: { id: { in: locationIds } },
        select: { id: true, name: true },
      })
    : [];
  const nameById = new Map(locations.map((l) => [l.id, l.name]));
  const rowsByLoc = new Map<
    string,
    { location: string; r1: number; r2: number; r3: number; r4: number; r5: number }
  >();
  for (const row of locStarsAgg) {
    const key = row.locationId;
    const cur =
      rowsByLoc.get(key) ?? { location: nameById.get(key) ?? key, r1: 0, r2: 0, r3: 0, r4: 0, r5: 0 };
    const prop = ("r" + String(row.rating)) as keyof typeof cur;
    (cur[prop] as unknown as number) = row._count._all;
    rowsByLoc.set(key, cur);
  }
  const byLocationStars = Array.from(rowsByLoc.values()).sort((a, b) =>
    a.location.localeCompare(b.location, "de")
  );

  // ---- NEU: byHour (0..23) aus publishedRows ----
  const hourCounts = new Array<number>(24).fill(0);
  for (const r of publishedRows) {
    const h = r.publishedAt.getHours();
    hourCounts[h] += 1;
  }
  const byHour = hourCounts.map((count, hour) => ({ hour, count }));

  // ---- NEU: Ø-Bewertung pro Tag (für Zeitstrahl-Linie) ----
  const dayAvgMap = new Map<string, { sum: number; n: number }>();
  for (const r of rowsWithRating) {
    if (r.publishedAt && typeof r.rating === "number") {
      const d = toISODate(r.publishedAt);
      const cur = dayAvgMap.get(d) ?? { sum: 0, n: 0 };
      cur.sum += r.rating;
      cur.n += 1;
      dayAvgMap.set(d, cur);
    }
  }
  const byDayAvgRating =
    dayAvgMap.size === 0
      ? undefined
      : Array.from(dayAvgMap.entries())
          .sort((a, b) => (a[0] < b[0] ? -1 : 1))
          .map(([date, { sum, n }]) => ({ date, avg: Number((sum / n).toFixed(2)) }));

  // ---- Ergebnis ----
  return {
    totalReviews: total,
    avgRating,
    replyRate,
    unansweredCount,
    responseTimeP50,
    byDay,
    byStars,
    byWeekday,
    byLocationStars,
    byHour,
    byDayAvgRating,
    slaUnder24hRate,
    responseTimeBuckets,
  };
}

/** Helpers */
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function startOfDayISO(iso: string): Date {
  return new Date(iso + "T00:00:00");
}
function endOfDayISO(iso: string): Date {
  return new Date(iso + "T23:59:59.999");
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
    byWeekday: Array.from({ length: 7 }).map((_, i) => ({
      weekday: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][i],
      count: 0,
    })),
    byLocationStars: [],
    byHour: Array.from({ length: 24 }).map((_, h) => ({ hour: h, count: 0 })),
    byDayAvgRating: undefined,
    slaUnder24hRate: undefined,
    responseTimeBuckets: undefined,
  };
}
