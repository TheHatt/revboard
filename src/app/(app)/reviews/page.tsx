// src/app/(app)/reviews/page.tsx
import { prisma } from "@/lib/prisma";
import ReviewsClient from "./ReviewsClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

// Cursor enc/dec (stable; wir verwenden in der Query nur id als Cursor)
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

// ---------------- URL-FILTER ----------------
type SP = Record<string, string | string[] | undefined>;

function normalizeFilters(sp: SP) {
  const raw = (k: string) => (Array.isArray(sp[k]) ? (sp[k] as string[])[0] : sp[k]) ?? null;

  const ratingStr = raw("rating");                 // z.B. "5" | "alle"
  const statusStr = raw("status");                 // "offen" | "beantwortet" | "alle"
  const range = (raw("range") as "vollständig" | "heute" | "7 Tage" | "30 Tage" | null) ?? "vollständig";
  const location = raw("location") ?? "alle";      // Standort-Name (UI) oder "alle"
  const takeStr = raw("take") ?? "12";
  const cursor = raw("cursor") ?? undefined;
  const q = raw("q")?.trim() ?? undefined;

  return {
    rating: ratingStr && ratingStr !== "alle" ? Number(ratingStr) : undefined,
    status: statusStr === "offen" ? "offen" : statusStr === "beantwortet" ? "beantwortet" : undefined,
    range,
    location, // UI: Name oder "alle"
    take: Math.max(1, Math.min(50, Number(takeStr) || 12)),
    cursor,
    q,
  };
}

export default async function Page({
  // ✅ Next 15: searchParams ist ein Promise<ReadonlyURLSearchParams>
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  // ---- Session / Tenancy ----
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; tenantId?: string; locationIds?: string[] } | undefined;

  if (!user?.id || !user?.tenantId) {
    redirect("/"); // freundlich zur Login-Seite
  }

  const tenantId = "demo-tenant-id";
  const allowedLocationIds = Array.isArray(user!.locationIds) ? user!.locationIds! : [];

  // ---- URL-Filter lesen ----
  const sp = await searchParams;
  const f = normalizeFilters(sp);

  // ---- Standorte laden (Name + ID) für UI & Validierung ----
  const locations = await prisma.location.findMany({
    where: {
      tenantId,
      ...(allowedLocationIds.length ? { id: { in: allowedLocationIds } } : {}),
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const uiLocationOptions = ["alle", ...locations.map((l) => l.name)];
  const selectedLocationName = uiLocationOptions.includes(f.location) ? f.location : "alle";

  // ---- WHERE-Bedingungen bauen ----
  const where: any = { tenantId };

  // Basis: Tenancy-Guard auf Location-IDs (immer anwenden, falls vorhanden)
  if (allowedLocationIds.length) {
    where.locationId = { in: allowedLocationIds };
  }

  // Standort-Filter nach NAME (UI), zusätzlich zu obigem ID-Guard
  if (selectedLocationName !== "alle") {
    // Falls Name → ID finden & zusätzlich zwingen (robuster und schneller)
    const match = locations.find((l) => l.name === selectedLocationName);
    if (match) {
      where.locationId = allowedLocationIds.length
        ? { in: allowedLocationIds.filter((id) => id === match.id) }
        : match.id;
    } else {
      // Kein Standort mit dem Namen im erlaubten Scope → leeres Ergebnis erzwingen
      where.locationId = "__NONE__";
    }
  }

  // Bewertung
  if (typeof f.rating === "number") {
    where.rating = f.rating;
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

  // Freitextsuche (insensitive)
  if (f.q) {
    where.text = { contains: f.q, mode: "insensitive" };
  }

  // ---- Cursor / Pagination ----
  const cursorObj = decodeCursor(f.cursor);

  const results = await prisma.review.findMany({
    where,
    orderBy: [{ publishedAt: "desc" as const }, { id: "desc" as const }],
    take: f.take + 1, // +1 für „weitere laden“
    ...(cursorObj ? { cursor: { id: cursorObj.id }, skip: 1 } : {}),
    include: {
      location: { select: { name: true } },
      reply: { select: { text: true, postedAt: true } },
    },
  });

  const hasMore = results.length > f.take;
  const slice = results.slice(0, f.take);

  // DTO fürs Frontend
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
        rating: typeof f.rating === "number" ? String(f.rating) : "alle",
        status: f.status ?? "alle",
        range: f.range ?? "vollständig",
        location: selectedLocationName,
        take: f.take,
      }}
    />
  );
}
