// src/app/(app)/reviews/ReviewsServer.tsx
import { prisma } from "@/lib/prisma";
import ReviewsClient from "./ReviewsClient";

export type ReviewsFilters = {
  rating: string;     // "alle" | "1".."5"
  status: string;     // "alle" | "offen" | "beantwortet"
  range: string;      // "vollständig" | "heute" | "7 Tage" | "30 Tage"
  location: string;   // "alle" | Standort-Name
  take: number;       // 1..50
  cursor?: string | null;
};

function encodeCursor(publishedAt: Date, id: string) {
  return `${publishedAt.toISOString()}_${id}`;
}
function decodeCursor(cursor?: string | null) {
  if (!cursor) return null;
  const [iso, id] = cursor.split("_");
  if (!iso || !id) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : { publishedAt: d, id };
}

export default async function ReviewsServer({
  tenantId,
  allowedLocationIds,
  uiLocationOptions,
  filters,
}: {
  tenantId: string;
  allowedLocationIds: string[];
  uiLocationOptions: string[]; // ["alle", ...names]
  filters: ReviewsFilters;
}) {
  // LOCATION-Param validieren
  const selectedLocation = uiLocationOptions.includes(filters.location) ? filters.location : "alle";

  // WHERE bauen (identisch zu deiner bisherigen Logik)
  const where: any = { tenantId };

  if (filters.rating !== "alle") where.rating = Number(filters.rating);
  if (filters.status === "offen") where.answeredAt = null;
  if (filters.status === "beantwortet") where.answeredAt = { not: null };

  if (filters.range && filters.range !== "vollständig") {
    const now = new Date();
    const from = new Date(now);
    if (filters.range === "heute") from.setHours(0, 0, 0, 0);
    else if (filters.range === "7 Tage") { from.setDate(now.getDate() - 7); from.setHours(0,0,0,0); }
    else if (filters.range === "30 Tage") { from.setDate(now.getDate() - 30); from.setHours(0,0,0,0); }
    where.publishedAt = { gte: from, lte: now };
  }

  if (selectedLocation !== "alle") {
    // Relation nach Name (dein bisheriges Verhalten)
    where.location = { name: selectedLocation };
  }

  // Scope-Guard
  if (allowedLocationIds.length > 0) {
    where.locationId = where.locationId
      ? (allowedLocationIds.includes(where.locationId) ? where.locationId : "__NONE__")
      : { in: allowedLocationIds };
  }

  const take = Math.min(Math.max(filters.take, 1), 50);
  const cursorObj = decodeCursor(filters.cursor);

  const results = await prisma.review.findMany({
    where,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(cursorObj ? { cursor: { id: cursorObj.id }, skip: 1 } : {}),
    include: {
      location: { select: { name: true } },
      reply: { select: { text: true, postedAt: true } },
    },
  });

  const hasMore = results.length > take;
  const slice = results.slice(0, take);

  const reviews = slice.map((r) => ({
    id: r.id,
    author: r.authorName ?? "Anonym",
    initials: (r.authorName ?? "A N").split(" ").map(s => s.charAt(0)).join("").slice(0,2).toUpperCase(),
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

  // Empty-State
  if (reviews.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
        Keine Rezensionen für die gewählten Filter.
      </div>
    );
  }

  return (
    <ReviewsClient
      role={"viewer"}
      reviews={reviews}
      nextCursor={nextCursor}
      locationOptions={uiLocationOptions}
      serverFilters={{
        rating: filters.rating,
        status: filters.status,
        range: filters.range,
        location: selectedLocation,
        take,
      }}
    />
  );
}
