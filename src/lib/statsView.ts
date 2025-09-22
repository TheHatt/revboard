import type { StatsDTO, StatsQuery } from "@/lib/stats";
import { MessageSquare, Star, CheckCircle2 } from "lucide-react";
import type { JSX } from "react";

export type StatsFilters = {
  range?: StatsQuery["range"] | null;
  locationId?: string | null;
};

export type StatItem = {
  key: string;
  label: string;
  value: string;
  sub?: string;
  // Wir geben hier die Icon-Komponente (optional) mit zurück,
  // damit der Client sie rendern kann, ohne Logik zu kennen.
  icon?: (props: { className?: string; "aria-hidden"?: boolean }) => JSX.Element;
};

export function getStatItems(stats: StatsDTO, filters: StatsFilters): StatItem[] {
  return [
    {
      key: "totalReviews",
      label: "Rezensionen",
      value: intlNumber(stats.totalReviews),
      sub: labelForRange(filters.range ?? undefined),
      icon: MessageSquare as any,
    },
    {
      key: "avgRating",
      label: "Ø-Bewertung",
      value: intlNumber(stats.avgRating, { maximumFractionDigits: 2 }),
      sub: "von 5 Sternen",
      icon: Star as any,
    },
    {
      key: "replyRate",
      label: "Antwortquote",
      value: formatPercent(stats.replyRate),
      sub: labelForRange(filters.range ?? undefined),
      icon: CheckCircle2 as any,
    },

    // 🔜 Hier kannst du später beliebig viele weitere Items ergänzen,
    // z. B. Median-Antwortzeit, Reviews/Tag, Anteil 5-Sterne usw.
  ];
}

export function intlNumber(n: number, opts: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat(undefined, opts).format(n);
}

export function formatPercent(n: number) {
  return `${Math.round(n * 100)}%`; // bewusst deterministisch (Hydration-safe)
}

export function labelForRange(range?: StatsFilters["range"] | null) {
  if (!range) return undefined;
  const map: Record<string, string> = {
    "heute": "heute",
    "7 Tage": "letzte 7 Tage",
    "30 Tage": "letzte 30 Tage",
    "vollständig": "gesamter Zeitraum",
  };
  return map[range] ?? undefined;
}
