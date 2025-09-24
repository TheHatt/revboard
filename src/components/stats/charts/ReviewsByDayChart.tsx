"use client";

import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Brush,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Point = { date: string; count: number };

export default function ReviewsByDayChart({
  data,
}: { data?: Point[] }) {
  const hasData = Array.isArray(data) && data.length > 0;

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-base">Rezensionen pro Tag</CardTitle>
      </CardHeader>
      <CardContent className="h-64">
        {!hasData ? (
          <div className="h-full grid place-items-center text-sm text-muted-foreground">
            Keine Zeitreihendaten vorhanden.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" />
              {/* Interaktiver Zoom/Scroll */}
              <Brush dataKey="date" travellerWidth={8} height={20} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
