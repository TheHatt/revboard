// src/app/(app)/stats/FilterBarStats.tsx
"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function FilterBarStats({
  initialRange,
  initialLocationId,
  locationOptions,
}: {
  initialRange?: "heute" | "7 Tage" | "30 Tage" | "vollständig";
  initialLocationId?: string;
  locationOptions: { id: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [range, setRange] = useState<string>(initialRange ?? "30 Tage");
  const [locationId, setLocationId] = useState<string>(initialLocationId ?? "all");

  const apply = useCallback(() => {
    const params = new URLSearchParams(searchParams?.toString());
    params.set("range", range);
    params.set("location", locationId);
    router.push(`${pathname}?${params.toString()}`);
  }, [range, locationId, pathname, router, searchParams]);

  const rangeOptions = useMemo(
    () => [
      { value: "heute", label: "Heute" },
      { value: "7 Tage", label: "Letzte 7 Tage" },
      { value: "30 Tage", label: "Letzte 30 Tage" },
      { value: "vollständig", label: "Vollständiger Zeitraum" },
    ],
    []
  );

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 items-end">
      <div>
        <label className="mb-1 block text-sm text-muted-foreground">Zeitraum</label>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Zeitraum wählen" />
          </SelectTrigger>
          <SelectContent className="z-50 bg-popover text-popover-foreground border rounded-md shadow-md">
            {rangeOptions.map((o) => (
              <SelectItem key={o.value} value={o.value} className="cursor-pointer focus:bg-accent focus:text-accent-foreground">
                {o.label}
                
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="mb-1 block text-sm text-muted-foreground">Standort</label>
        <Select value={locationId} onValueChange={setLocationId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Standort wählen" />
          </SelectTrigger>
          <SelectContent className="bg-popover text-popover-foreground border rounded-md shadow-md">
            {locationOptions.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="sm:justify-self-start">
        <Button onClick={apply} variant="secondary" className="w-full sm:w-auto">Anwenden</Button>
      </div>
    </div>
  );
}
