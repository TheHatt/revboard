// src/app/(app)/reviews/page.tsx
import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantAndLocationsForUser } from "@/lib/tenancy";
import ReviewsSkeleton from "./ReviewsSkeleton";
import ReviewsServer from "./ReviewsServer";

type SearchParams = {
  cursor?: string;
  take?: string;
  rating?: string;     // "alle" | "1".."5"
  status?: string;     // "alle" | "offen" | "beantwortet"
  location?: string;   // "alle" | Standort-Name
  range?: string;      // "vollständig" | "heute" | "7 Tage" | "30 Tage"
};

// URL-Filter normalisieren
function normalizeFilters(sp: Record<string, string | string[] | undefined>) {
  const raw = (k: string) => (Array.isArray(sp[k]) ? (sp[k] as string[])[0] : sp[k]) ?? null;
  return {
    rating: (raw("rating") ?? "alle") as string,
    status: (raw("status") ?? "alle") as string,
    range: (raw("range") ?? "vollständig") as string,
    location: (raw("location") ?? "alle") as string,  // Standort-Name oder "alle"
    take: Math.min(Math.max(Number(raw("take") ?? 12), 1), 50),
    cursor: (raw("cursor") as string | null) ?? null,
  };
}

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  // ---- Tenancy aus Session ableiten ----
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) {
    throw new Error("Keine Session oder user.id – bitte einloggen.");
  }

  const { tenantId, allowedLocationIds, locationOptions } =
    await getTenantAndLocationsForUser(userId);

  // UI-Optionen als Namen (bestehendes Verhalten): ["alle", ...]
  const uiLocationOptions = ["alle", ...locationOptions.map((l) => l.label)];

  // ---- URL-Filter lesen & normalisieren ----
  const filters = normalizeFilters(searchParams as any);

  return (
    <main className="flex flex-col gap-6 p-6">
      {/* Deine bestehende Filterbar kann hier weiterhin gerendert werden */}

      <Suspense fallback={<ReviewsSkeleton />}>
        <ReviewsServer
          tenantId={tenantId}
          allowedLocationIds={allowedLocationIds}
          uiLocationOptions={uiLocationOptions}
          filters={filters}
        />
      </Suspense>
    </main>
  );
}
