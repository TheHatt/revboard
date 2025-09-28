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
import * as React from "react";

export type Keyword = { term: string; count: number };

export default function TopKeywordsChart({
  data,
  title = "Häufigste Begriffe",
  onSelect,
  max = 10,
}: {
  data?: Keyword[];
  title?: string;
  onSelect?: (term: string) => void; // Klick auf Balken → Filter setzen/nach Reviews springen
  max?: number;
}) {
  const hasData = Array.isArray(data) && data.length > 0;

  // Sortiert absteigend, Top N, und kurze Labels
  const rows = hasData
    ? [...data]
        .sort((a, b) => b.count - a.count)
        .slice(0, max)
        .map(k => ({
          term: k.term.length > 24 ? k.term.slice(0, 21) + "…" : k.term,
          count: k.count,
          _raw: k.term,
        }))
    : [];

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        {!hasData ? (
          <div className="h-full grid place-items-center text-sm text-muted-foreground">
            Noch keine Begriffsstatistik vorhanden.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              layout="vertical"
              onClick={(e: any) => {
                const term = e?.activePayload?.[0]?.payload?._raw as string | undefined;
                if (term && onSelect) onSelect(term);
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="term" width={130} />
              <Tooltip />
              <Bar dataKey="count" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
