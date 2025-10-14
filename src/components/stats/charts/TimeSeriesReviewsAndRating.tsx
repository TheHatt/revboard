"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Brush,
  Legend,
} from "recharts";

export type CountPoint = { date: string; count: number };
export type RatingPoint = { date: string; avg: number }; // 0..5

type Props = {
  counts?: CountPoint[];
  avgRatings?: RatingPoint[];
  title?: string;
  onBrushChange?: (fromISO: string, toISO: string) => void;
};

export default function TimeSeriesReviewsAndRating({
  counts,
  avgRatings,
  title = "Rezensionen & Ø-Bewertung über Zeit",
  onBrushChange,
}: Props) {
  // ⬇️ Neu: erst nach Client-Mount rendern (verhindert Hydration-Mismatch)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const hasCounts = Array.isArray(counts) && counts.length > 0;
  const data = useMemo(
    () => (hasCounts ? computeRunningAvg(mergeSeries(counts!, avgRatings ?? [])) : []),
    [hasCounts, counts, avgRatings]
  );

  // Brush-Range kontrolliert
  const [range, setRange] = useState<{ start: number; end: number }>({ start: 0, end: Math.max(0, data.length - 1) });
  useEffect(() => {
    setRange({ start: 0, end: Math.max(0, data.length - 1) });
  }, [data.length]);

  function handleBrush(r: any) {
    if (!r || !onBrushChange || data.length === 0) return;
    const s = Math.max(0, r.startIndex ?? 0);
    const e = Math.min(data.length - 1, r.endIndex ?? data.length - 1);
    const from = data[s]?.date;
    const to = data[e]?.date;
    setRange({ start: s, end: e });
    if (from && to) onBrushChange(from, to);
  }

  // ⬇️ Wichtig: Server & Client liefern VOR Mount exakt dasselbe Markup
  if (!mounted) {
    return <div className="h-80" />; // identischer Platzhalter auf Server & Client
  }

  return (
    <div className="h-80">
      {!hasCounts ? (
        <div className="h-full grid place-items-center text-sm text-muted-foreground">
          Keine Zeitreihendaten vorhanden.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={{ stroke: "hsl(var(--border))" }}
            />
            <YAxis
              yAxisId="left"
              allowDecimals={false}
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={{ stroke: "hsl(var(--border))" }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 5]}
              ticks={[0, 1, 2, 3, 4, 5]}
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={{ stroke: "hsl(var(--border))" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
                color: "hsl(var(--card-foreground))",
              }}
              formatter={(value: any, name) => {
                if (name === "Rezensionen") return [Intl.NumberFormat().format(value), "Rezensionen"];
                if (name === "Ø-Bewertung (kumuliert)") return [value != null ? `⭐ ${Number(value).toFixed(2)}` : "—", "Ø"];
                return [value, name];
              }}
              labelFormatter={(d) => d}
            />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: 8, fontSize: 12, color: "hsl(var(--muted-foreground))" }}
            />
            <Bar yAxisId="left" dataKey="count" name="Rezensionen" fill="hsl(var(--chart-1))" isAnimationActive={false} />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="avgRunning"
              name="Ø-Bewertung (kumuliert)"
              dot={false}
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              isAnimationActive={false}
            />
            <Brush
              dataKey="date"
              startIndex={range.start}
              endIndex={range.end}
              onChange={handleBrush}
              height={26}
              travellerWidth={10}
              stroke="hsl(var(--border))"
              fill="hsl(var(--card))"
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

/** merge: {date,count}[] + {date,avg}[] */
function mergeSeries(counts: CountPoint[], avgRatings: RatingPoint[]) {
  const map = new Map<string, { date: string; count: number; dayAvg?: number }>();
  for (const c of counts) map.set(c.date, { date: c.date, count: c.count });
  for (const r of avgRatings) {
    const row = map.get(r.date) ?? { date: r.date, count: 0 };
    row.dayAvg = r.avg;
    map.set(r.date, row);
  }
  return Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** kumulativer (gewichteter) Durchschnitt */
function computeRunningAvg(rows: Array<{ date: string; count: number; dayAvg?: number }>) {
  let cumCount = 0;
  let cumSum = 0;
  return rows.map((row) => {
    const c = +row.count || 0;
    if (typeof row.dayAvg === "number" && c > 0) {
      cumSum += row.dayAvg * c;
      cumCount += c;
    }
    return {
      date: row.date,
      count: row.count,
      avgRunning: cumCount > 0 ? Number((cumSum / cumCount).toFixed(2)) : null,
    };
  });
}
