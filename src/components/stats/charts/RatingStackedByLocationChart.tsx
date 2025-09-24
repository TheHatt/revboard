"use client";

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Erwartetes Format:
 * [
 *  { location: "Erlangen", r1: 2, r2: 5, r3: 8, r4: 12, r5: 30 },
 *  { location: "Nürnberg", r1: 1, r2: 4, r3: 3, r4: 10, r5: 25 },
 * ]
 * Falls noch nicht vorhanden → freundlicher Leerstaat.
 */
type Row = { location: string; r1: number; r2: number; r3: number; r4: number; r5: number };

export default function RatingStackedByLocationChart({ data }: { data?: Row[] }) {
  const hasData = Array.isArray(data) && data.length > 0;

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-base">Ratings je Standort (gestapelt)</CardTitle>
      </CardHeader>
      <CardContent className="h-64">
        {!hasData ? (
          <div className="h-full grid place-items-center text-sm text-muted-foreground">
            Keine Standortdaten vorhanden.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="location" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="r1" stackId="rating" name="★1" />
              <Bar dataKey="r2" stackId="rating" name="★2" />
              <Bar dataKey="r3" stackId="rating" name="★3" />
              <Bar dataKey="r4" stackId="rating" name="★4" />
              <Bar dataKey="r5" stackId="rating" name="★5" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
