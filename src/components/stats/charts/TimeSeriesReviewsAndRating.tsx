"use client";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type CountPoint = { date: string; count: number };
export type RatingPoint = { date: string; avg: number }; // 0..5

type Props = {
  counts?: CountPoint[];          // {date, count}[]  – Pflicht für Balken
  avgRatings?: RatingPoint[];     // {date, avg}[]    – optional für Linie (0..5)
  title?: string;
  onBrushChange?: (fromISO: string, toISO: string) => void;
};

export default function TimeSeriesReviewsAndRating({
  counts,
  avgRatings,
  title = "Rezensionen & Ø-Bewertung über Zeit",
  onBrushChange,
}: Props) {
  const hasCounts = Array.isArray(counts) && counts.length > 0;
  const hasAvg = Array.isArray(avgRatings) && avgRatings.length > 0;

  // Daten nach Datum mergen, damit Balken + Linie exakt ausgerichtet sind.
  const data = hasCounts
    ? mergeSeries(counts!, avgRatings ?? [])
    : [];

  return (
    <div>
      <CardContent className="h-80">
        {!hasCounts ? (
          <div className="h-full grid place-items-center text-sm text-muted-foreground">
            Keine Zeitreihendaten vorhanden.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              {/* linke Y-Achse: Anzahl */}
              <YAxis yAxisId="left" allowDecimals={false} />
              {/* rechte Y-Achse: Rating 0..5 (falls vorhanden) */}
              {hasAvg && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 5]}
                  ticks={[0,1,2,3,4,5]}
                />
              )}
              <Tooltip />
              <Legend />
              {/* Balken = Reviews */}
              <Bar yAxisId="left" dataKey="count" name="Rezensionen" />
              {/* Linie = Ø-Rating (optional) */}
              {hasAvg && <Line yAxisId="right" type="monotone" dataKey="avg" name="Ø-Bewertung" />}
              <Brush
                dataKey="date"
                travellerWidth={8}
                height={20}
                onChange={(range: any) => {
                  if (!onBrushChange || !range) return;
                  const s = Math.max(0, range.startIndex ?? 0);
                  const e = Math.min(data.length - 1, range.endIndex ?? data.length - 1);
                  const from = data[s]?.date;
                  const to   = data[e]?.date;
                  if (from && to) onBrushChange(from, to);
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </div>
  );
}

/** mergt {date,count}[] + {date,avg}[] nach Datum */
function mergeSeries(counts: CountPoint[], avgRatings: RatingPoint[]) {
  const map = new Map<string, { date: string; count: number; avg?: number }>();
  for (const c of counts) {
    map.set(c.date, { date: c.date, count: c.count });
  }
  for (const r of avgRatings) {
    const row = map.get(r.date) ?? { date: r.date, count: 0 };
    row.avg = r.avg;
    map.set(r.date, row);
  }
  // sort nach Datum (string "YYYY-MM-DD" funktioniert lexikografisch)
  return Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
}
