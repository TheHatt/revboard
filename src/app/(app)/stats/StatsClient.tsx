// src/app/(app)/stats/StatsClient.tsx
"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, MessageSquare, CheckCircle2 } from "lucide-react";
import type { StatsQuery, StatsDTO } from "@/lib/stats";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import ReviewsByWeekdayChart from "@/components/stats/charts/ReviewsByWeekdayChart";
import RatingByStarsChart from "@/components/stats/charts/RatingByStarsChart";
import TimeSeriesReviewsAndRating from "@/components/stats/charts/TimeSeriesReviewsAndRating";
import TopKeywordsChart from "@/components/stats/charts/TopKeywordsChart";

// Recharts (nur für Uhrzeit-Inhaltskomponente)
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export type StatsFilters = {
  range?: StatsQuery["range"] | null;
  locationId?: string | null;
};

export default function StatsClient({
  stats,
  filters,
}: {
  stats: StatsDTO;
  filters: StatsFilters;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(sp?.toString());
    if (value == null || value === "") params.delete(key);
    else params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  function toReviewsUrl(extra?: Record<string, string | null>) {
    const params = new URLSearchParams(sp?.toString());
    if (extra) {
      Object.entries(extra).forEach(([k, v]) => {
        if (v == null || v === "") params.delete(k);
        else params.set(k, v);
      });
    }
    return `/reviews?${params.toString()}`;
  }

  const weekdayParam = sp.get("weekday");
  const weekdayLabel = (idx: number) =>
    ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][idx] ?? String(idx);

  // ── KPI Cards (bleiben als Cards hier im StatsClient) ────────────────────────
  const kpis = useMemo(
    () => [
      {
        key: "totalReviews",
        label: "Rezensionen",
        value: intlNumber(stats.totalReviews),
        sub: labelForRange(filters.range ?? undefined),
        icon: MessageSquare,
      },
      {
        key: "avgRating",
        label: "Ø-Bewertung",
        value: intlNumber(stats.avgRating, { maximumFractionDigits: 2 }),
        sub: "von 5 Sternen",
        icon: Star,
      },
      {
        key: "unanswered_and_reply",
        label: "Unbeantwortet & Antwortquote",
        value: intlNumber(stats.unansweredCount),
        sub: `Antwortquote ${formatPercent(stats.replyRate)}`,
        icon: MessageSquare,
      },
      {
        key: "responseTimeP50",
        label: "Antwortzeit (Median)",
        value:
          stats.responseTimeP50 == null ? "—" : formatDuration(stats.responseTimeP50),
        sub:
          typeof (stats as any).slaUnder24hRate === "number"
            ? `${Math.round(((stats as any).slaUnder24hRate as number) * 100)}% < 24h`
            : undefined,
        icon: CheckCircle2,
      },
    ],
    [stats, filters.range]
  );

  if (stats.totalReviews === 0) {
    return (
      <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
        Keine Daten für den ausgewählten Zeitraum/Standort.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* REIHE 1: 4 kleine KPI-Cards */}
      <section className="col-span-12 grid grid-cols-12 gap-6" aria-label="Kernkennzahlen">
        {kpis.map((it) => (
          <div key={it.key} className="col-span-12 sm:col-span-6 xl:col-span-3">
            <Card className="h-full rounded-2xl shadow-sm transition-shadow hover:shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-1">
                <CardTitle className="text-[13px] font-medium text-muted-foreground tracking-tight">
                  {it.label}
                </CardTitle>
                <it.icon className="size-4 opacity-70" aria-hidden />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-[28px] font-semibold leading-none">{it.value}</div>
                {it.sub ? (
                  <p className="mt-1 text-xs text-muted-foreground">{it.sub}</p>
                ) : null}
                {it.key === "responseTimeP50" ? (
                  <MiniSparkline
                    buckets={(stats as any).responseTimeBuckets as number[] | undefined}
                  />
                ) : null}
              </CardContent>
            </Card>
          </div>
        ))}
      </section>

      {/* Aktiver Wochentags-Filter */}
      {weekdayParam && (
        <div className="col-span-12 flex flex-wrap gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-sm shadow-sm"
            onClick={() => setParam("weekday", null)}
            aria-label="Wochentag-Filter entfernen"
          >
            <span className="opacity-70">Wochentag:</span>
            <span className="font-medium">{weekdayLabel(Number(weekdayParam))}</span>
            <span aria-hidden>×</span>
          </button>
        </div>
      )}

      {/* REIHE 2: 1 große Card – Shell hier, Inhalt in Komponente */}
      <section className="col-span-12">
        <Card className="h-full rounded-2xl shadow-sm transition-shadow hover:shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Rezensionen pro Tag & Ø-Bewertung über Zeit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TimeSeriesReviewsAndRating
              counts={(stats as any).byDay}
              avgRatings={(stats as any).byDayAvgRating}
              onBrushChange={(from: string, to: string) => {
                setParam("from", from);
                setParam("to", to);
              }}
            />
          </CardContent>
        </Card>
      </section>

      {/* REIHE 3: 2 mittlere – beide mit gleicher Card-Hülle */}
      <section className="col-span-12 grid grid-cols-12 gap-6">
        <div className="col-span-12 xl:col-span-6">
          <Card className="h-full rounded-2xl shadow-sm transition-shadow hover:shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Rezensionen nach Uhrzeit</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ReviewsByHourContent data={(stats as any).byHour} />
            </CardContent>
          </Card>
        </div>
        <div className="col-span-12 xl:col-span-6">
          <Card className="h-full rounded-2xl shadow-sm transition-shadow hover:shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Rezensionen nach Wochentag</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ReviewsByWeekdayChart
                data={(stats as any).byWeekday}
                onSelectWeekday={(idx) => setParam("weekday", String(idx))}
                rightSlot={
                  <a
                    href={toReviewsUrl({})}
                    className="text-sm underline underline-offset-4 hover:opacity-80"
                  >
                    Zu Rezensionen
                  </a>
                }
              />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* REIHE 4: 2 mittlere – gleiche Card-Hülle */}
      <section className="col-span-12 grid grid-cols-12 gap-6">
        <div className="col-span-12 xl:col-span-6">
          <Card className="h-full rounded-2xl shadow-sm transition-shadow hover:shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Häufigste Begriffe</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <TopKeywordsChart
                data={(stats as any).topKeywords}
                onSelect={(term) => router.push(toReviewsUrl({ q: term }))}
              />
            </CardContent>
          </Card>
        </div>
        <div className="col-span-12 xl:col-span-6">
          <Card className="h-full rounded-2xl shadow-sm transition-shadow hover:shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Anzahl Rating nach Sternen</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <RatingByStarsChart data={(stats as any).byStars} />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

/** --------- Inhalt-only: „Rezensionen nach Uhrzeit“ (0–23) --------- */
function ReviewsByHourContent({
  data,
}: {
  data?: Array<{ hour: number | string; count: number }>;
}) {
  const hasData = Array.isArray(data) && data.length > 0;

  // 0..23 normalisieren (leere Stunden auffüllen)
  const rows = hasData
    ? Array.from({ length: 24 }).map((_, h) => {
        const hit = data!.find((d) => Number(d.hour) === h);
        return { hour: h, count: hit ? hit.count : 0 };
      })
    : [];

  if (!hasData) {
    return (
      <div className="h-full grid place-items-center text-sm text-muted-foreground">
        Noch keine Stundendaten vorhanden.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="hour"
          tickMargin={6}
          ticks={[0, 3, 6, 9, 12, 15, 18, 21]}
        />
        <YAxis allowDecimals={false} />
        <Tooltip
          formatter={(val: any) => [Intl.NumberFormat().format(val), "Rezensionen"]}
          labelFormatter={(h) => `Uhrzeit: ${String(h).padStart(2, "0")}:00`}
        />
        <Bar dataKey="count" />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** -------- Utils -------- */

function intlNumber(n: number, opts: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat(undefined, opts).format(n);
}

function formatPercent(n: number) {
  return `${Math.round(n * 100)}%`;
}

function formatDuration(totalSeconds: number) {
  if (totalSeconds == null) return "—";
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

function labelForRange(range?: StatsFilters["range"] | null) {
  if (!range) return undefined;
  const map: Record<string, string> = {
    heute: "heute",
    "7 Tage": "letzte 7 Tage",
    "30 Tage": "letzte 30 Tage",
    vollständig: "gesamter Zeitraum",
  };
  return map[range] ?? undefined;
}

/** Mini-Sparkline für Antwortzeit-Verteilung (Buckets) */
function MiniSparkline({ buckets }: { buckets?: number[] }) {
  if (!buckets || buckets.length === 0) return null;
  const max = Math.max(...buckets);
  if (max <= 0) return null;

  const w = 140,
    h = 28,
    gap = 3;
  const barW = (w - gap * (buckets.length - 1)) / buckets.length;

  return (
    <div className="mt-2">
      <svg
        width="100%"
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label="Antwortzeit-Verteilung"
      >
        {buckets.map((v, i) => {
          const bh = Math.max(1, Math.round((v / max) * (h - 2)));
          const x = i * (barW + gap);
          const y = h - bh;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barW}
              height={bh}
              rx={1}
              className="fill-current opacity-60"
            />
          );
        })}
      </svg>
      <p className="mt-1 text-[10px] text-muted-foreground">
        Verteilung der Antwortzeiten
      </p>
    </div>
  );
}
