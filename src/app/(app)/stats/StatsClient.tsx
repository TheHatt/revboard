// src/app/(app)/stats/StatsClient.tsx
"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, MessageSquare, CheckCircle2 } from "lucide-react";
import type { StatsQuery, StatsDTO } from "@/lib/stats";
import ReviewsByDayChart from "@/components/stats/charts/ReviewsByDayChart";
import RatingByStarsChart from "@/components/stats/charts/RatingByStarsChart";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import ReviewsByWeekdayChart from "@/components/stats/charts/ReviewsByWeekdayChart";
import RatingStackedByLocationChart from "@/components/stats/charts/RatingStackedByLocationChart";



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

function pushParam(key: string, value: string | null) {
  const params = new URLSearchParams(sp?.toString());
  if (value == null || value === "") params.delete(key);
  else params.set(key, value);
  router.push(`${pathname}?${params.toString()}`);
}
  // Hook immer zuerst aufrufen (keine Bedingung davor)
  const items = useMemo(
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
        key: "replyRate",
        label: "Antwortquote",
        value: formatPercent(stats.replyRate), // deterministisch, Hydration-safe
        sub: labelForRange(filters.range ?? undefined),
        icon: CheckCircle2,
      },
      {
        key: "unansweredCount",
        label: "Unbeantwortet",
        value: intlNumber(stats.unansweredCount),
        sub: labelForRange(filters.range ?? undefined),
        icon: MessageSquare, // oder CircleHelp, je nach Geschmack
      },
      {
        key: "responseTimeP50",
        label: "Median Antwortzeit",
        value: stats.responseTimeP50 == null
          ? "—"
          : formatDuration(stats.responseTimeP50), // s -> lesbar
        sub: labelForRange(filters.range ?? undefined),
        icon: CheckCircle2,
      },
    ],
    // feingranulare Deps, damit nicht unnötig neu berechnet wird
    [stats.totalReviews, stats.avgRating, stats.replyRate, filters.range]
  );

  const isEmpty = stats.totalReviews === 0;

  if (isEmpty) {
    return (
      <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
        Keine Daten für den ausgewählten Zeitraum/Standort.
      </div>
    );
  }

  return (
    <section
      aria-label="Kernkennzahlen"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {items.map((it) => (
        <Card key={it.key} className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {it.label}
            </CardTitle>
            <it.icon className="size-5" aria-hidden />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold leading-tight">
              {it.value}
            </div>
            {it.sub ? (
              <p className="mt-1 text-xs text-muted-foreground">{it.sub}</p>
            ) : null}
          </CardContent>
        </Card>
      ))}


        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 mt-4">
        <ReviewsByWeekdayChart
            data={(stats as any).byWeekday /* erwartet [{weekday:"Mo",count:...}] */}
            onSelectWeekday={(idx) => pushParam("weekday", String(idx))}
        />
        <RatingStackedByLocationChart
            data={(stats as any).byLocationStars /* erwartet Array wie in Komponentendoc */}
        />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 mt-4">
        <ReviewsByDayChart data={(stats as any).byDay} />
        <RatingByStarsChart data={(stats as any).byStars} />
        </div>

    </section>
    
  );
}

function intlNumber(n: number, opts: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat(undefined, opts).format(n);
}

function formatPercent(n: number) {
  return `${Math.round(n * 100)}%`;
}

function formatDuration(totalSeconds: number) {
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
