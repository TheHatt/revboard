"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { memo } from "react";
import type { JSX } from "react";

type Props = {
  label: string;
  value: string;
  sub?: string;
  Icon?: (props: { className?: string; "aria-hidden"?: boolean }) => JSX.Element;
};

function CardStatBase({ label, value, sub, Icon }: Props) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        {Icon ? <Icon className="size-5" aria-hidden /> : null}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold leading-tight">{value}</div>
        {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
      </CardContent>
    </Card>
  );
}

// Memoisiert nach Props-Shallow-Equal – für 10+ Cards sinnvoll
export default memo(CardStatBase);
