"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Bucket = { stars: number; count: number };
export default function RatingByStarsChart({ data }: { data?: Bucket[] }) {
  const hasData = Array.isArray(data) && data.length > 0;

  return (
    <div>
      <CardContent className="h-72">
        {!hasData ? (
          <div className="h-full grid place-items-center text-sm text-muted-foreground">
            Keine Verteilungsdaten vorhanden.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="stars" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
      </div>
  );
}
