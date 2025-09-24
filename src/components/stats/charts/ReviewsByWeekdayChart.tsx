"use client";

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Bucket = { weekday: string; count: number };
type Props = {
  data?: Bucket[];
  onSelectWeekday?: (weekdayIndex: number) => void; // 0=So..6=Sa
};

const WEEKDAYS = ["So","Mo","Di","Mi","Do","Fr","Sa"];

export default function ReviewsByWeekdayChart({ data, onSelectWeekday }: Props) {
  const hasData = Array.isArray(data) && data.length > 0;
  const normalized =
    hasData
      ? WEEKDAYS.map((label, idx) => ({
          weekday: label,
          count: data.find(d => d.weekday === label || d.weekday === String(idx))?.count ?? 0,
          _idx: idx,
        }))
      : [];

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-base">Rezensionen nach Wochentag</CardTitle>
      </CardHeader>
      <CardContent className="h-64">
        {!hasData ? (
          <div className="h-full grid place-items-center text-sm text-muted-foreground">
            Keine Wochentagsdaten vorhanden.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={normalized}
              onClick={(e: any) => {
                const idx = e?.activePayload?.[0]?.payload?._idx;
                if (typeof idx === "number" && onSelectWeekday) onSelectWeekday(idx);
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="weekday" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
