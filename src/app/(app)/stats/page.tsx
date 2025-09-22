// src/app/(app)/stats/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStats, type StatsQuery } from "@/lib/stats";
import StatsClient from "./StatsClient";
import FilterBarStats from "./FilterBarStats";

type SP = Record<string, string | string[] | undefined>;

function normalize(sp: SP) {
  const raw = (k: string) => (Array.isArray(sp[k]) ? (sp[k] as string[])[0] : sp[k]) ?? null;
  const range = (raw("range") as StatsQuery["range"]) ?? "30 Tage";
  const loc = raw("location"); // erwartet: "alle" | locationId
  return {
    range,
    locationId: !loc || loc === "alle" || loc === "all" ? null : (loc as string),
  };
}

export default async function Page({
  searchParams,
}: {
  // Next.js 15: searchParams ist ein Promise
  searchParams: Promise<SP>;
}) {
  // --- Session / Tenancy ---
  const session = await getServerSession(authOptions);
  const user = session?.user as
    | { id: string; tenantId: string; locationIds?: string[] }
    | undefined;
  if (!user?.id || !user.tenantId) {
    throw new Error("Nicht eingeloggt oder fehlende Tenancy.");
  }

  const tenantId = user.tenantId;
  const allowedLocationIds = user.locationIds ?? [];

  // --- Locations laden (Name + ID) ---
  const locs = await prisma.location.findMany({
    where: { tenantId, ...(allowedLocationIds.length ? { id: { in: allowedLocationIds } } : {}) },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // ✅ EXAKT die Struktur, die FilterBarStats erwartet: { id, label }[]
  const locationOptions: { id: string; label: string }[] = [
    { id: "alle", label: "Alle Standorte" },
    ...locs.map((l) => ({ id: l.id, label: l.name })),
  ];

  // --- URL lesen (Promise!) & filtern ---
  const sp = await searchParams;
  const f = normalize(sp);

  // Falls ungültige locationId ankommt, auf null zurücksetzen
  const validLocationId =
    f.locationId && locs.some((l) => l.id === f.locationId) ? f.locationId : null;

  // --- Stats ziehen ---
  const stats = await getStats(tenantId, allowedLocationIds, {
    range: f.range,
    locationId: validLocationId ?? undefined,
  });

  return (
    <main className="flex flex-col gap-6">
      <header>
        <FilterBarStats
          initialRange={f.range}
          initialLocationId={validLocationId ?? undefined}
          locationOptions={locationOptions}
        />
      </header>

      <section>
        <StatsClient
          stats={stats}
          filters={{ range: f.range, locationId: validLocationId }}
        />
      </section>
    </main>
  );
}
