// src/app/(app)/reviews/page.tsx
import { prisma } from "@/lib/prisma";
import ReviewsClient from "./ReviewsClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type SearchParams = {
  cursor?: string;
  take?: string;
  rating?: string;     // "alle" | "1".."5"
  status?: string;     // "alle" | "offen" | "beantwortet"
  location?: string;   // "alle" | Standort-Name
  range?: string;      // "vollständig" | "heute" | "7 Tage" | "30 Tage"
};

// Cursor enc/dec
function encodeCursor(publishedAt: Date, id: string) {
  return `${publishedAt.toISOString()}_${id}`;
}
function decodeCursor(cursor?: string) {
  if (!cursor) return null;
  const [iso, id] = cursor.split("_");
  if (!iso || !id) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : { publishedAt: d, id };
}

// URL-Filter normalisieren
function normalizeFilters(sp: Record<string, string | string[] | undefined>) {
  const raw = (k: string) => (Array.isArray(sp[k]) ? (sp[k] as string[])[0] : sp[k]) ?? null;
  return {
    rating: raw("rating") ?? "alle",
    status: raw("status") ?? "alle",
    range: raw("range") ?? "vollständig",
    location: raw("location") ?? "alle", // Standort-Name oder "alle"
    take: raw("take"),
    cursor: raw("cursor"),
  };
}

export default async function Page({
  searchParams,
}: {
  // ✅ Next 15: searchParams ist ein Promise
  searchParams: Promise<SearchParams>;
}) {
  // ---- Tenancy aus Session ableiten ----
  const session = await getServerSession(authOptions);
  const user = session?.user as
    | { id: string; tenantId: string; locationIds: string[] }
    | undefined;
  if (!user?.id) {
    throw new Error("Keine Session oder user.id – bitte einloggen.");
  }

  const tenantId = user.tenantId;
  const allowedLocationIds = user.locationIds ?? [];

  // Standortnamen frisch aus DB (immer aktuell)
  const locations = await prisma.location.findMany({
    where: { tenantId, ...(allowedLocationIds.length ? { id: { in: allowedLocationIds } } : {}) },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const uiLocationOptions = ["alle", ...locations.map((l) => l.name)];

  // ---- URL-Filter lesen & validieren ----
  const sp = await searchParams; // ✅ Promise auflösen
  const f = normalizeFilters(sp as any);

  const selectedLocation =
    f.location && uiLocationOptions.includes(f.location) ? f.location : "alle";

  const take = Math.min(Math.max(Number(f.take ?? 12), 1), 50);

  // ---- WHERE-Bedingungen bauen ----
  const where: any = { tenantId };

  // Bewertung
  if (f.rating && f.rating !== "alle") {
    where.rating = Number(f.rating);
  }

  // Status
  if (f.status === "offen") where.answeredAt = null;
  if (f.status === "beantwortet") where.answeredAt = { not: null };

  // Zeitraum
  if (f.range && f.range !== "vollständig") {
    const now = new Date();
    const from = new Date(now);
    if (f.range === "heute") {
      from.setHours(0, 0, 0, 0);
    } else if (f.range === "7 Tage") {
      from.setDate(now.getDate() - 7);
      from.setHours(0, 0, 0, 0);
    } else if (f.range === "30 Tage") {
      from.setDate(now.getDate() - 30);
      from.setHours(0, 0, 0, 0);
    }
    where.publishedAt = { gte: from, lte: now };
  }

  // Standort per NAME (bestehende UI) ODER "alle"
  if (selectedLocation && selectedLocation !== "alle") {
    where.location = { name: selectedLocation };
  }

  // **Scope-Guard**: nur erlaubte Locations
  if (allowedLocationIds.length > 0) {
    where.locationId = where.locationId
      ? allowedLocationIds.includes(where.locationId)
        ? where.locationId
        : "__NONE__"
      : { in: allowedLocationIds };
  }

  // ---- Cursor / Pagination ----
  const cursorObj = decodeCursor(f.cursor ?? undefined);

  const results = await prisma.review.findMany({
    where,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: take + 1, // +1 für „weitere laden“
    ...(cursorObj ? { cursor: { id: cursorObj.id }, skip: 1 } : {}),
    include: {
      location: { select: { name: true } },
      reply: { select: { text: true, postedAt: true } },
    },
  });

  const hasMore = results.length > take;
  const slice = results.slice(0, take);

  // → DTO fürs Frontend
  const reviews = slice.map((r) => ({
    id: r.id,
    author: r.authorName ?? "Anonym",
    initials: (r.authorName ?? "A N")
      .split(" ")
      .map((s) => s.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    stars: r.rating,
    text: r.text ?? "",
    location: r.location?.name ?? "—",
    publishedAt: r.publishedAt.toISOString(),
    answered: !!r.answeredAt,
    replyText: r.reply?.text ?? undefined,
  }));

  const nextCursor = hasMore
    ? encodeCursor(slice[slice.length - 1].publishedAt, slice[slice.length - 1].id)
    : undefined;

  return (
    <ReviewsClient
      role={"viewer"}
      reviews={reviews}
      nextCursor={nextCursor}
      locationOptions={uiLocationOptions}
      serverFilters={{
        rating: f.rating,
        status: f.status,
        range: f.range,
        location: selectedLocation,
        take,
      }}
    />
  );
}
