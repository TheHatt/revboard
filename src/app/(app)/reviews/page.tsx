import { prisma } from "@/lib/prisma";
import ReviewsClient from "./ReviewsClient";
import { listTenantLocations } from "@/lib/locations";
// import { getSession } from "@/lib/auth"; // wenn deine echte Session bereits da ist

type SearchParams = {
  cursor?: string;
  take?: string;
  rating?: string;     // "alle" | "1".."5"
  status?: string;     // "alle" | "offen" | "beantwortet"
  location?: string;   // "alle" | Standort-Name
  range?: string;      // "vollständig" | "heute" | "7 Tage" | "30 Tage"
};

// TODO: später echte Auth (Session → tenantId)
async function getTenantId() {
  return "demo-tenant-id";
}

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

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const tenantId = await getTenantId();
  // echte Session (falls schon Stub): const session = await getSession();
  const allowedLocationIds: string[] = []; // z. B. session.allowedLocationIds
  const locRows = await listTenantLocations(tenantId, allowedLocationIds);
  const locationOptions = ["alle", ...locRows.map((l) => l.name)];

  const take = Math.min(Math.max(Number(searchParams.take ?? 12), 1), 50);

  // --- Filter bauen ---
  const where: any = { tenantId };

  if (searchParams.rating && searchParams.rating !== "alle") {
    where.rating = Number(searchParams.rating);
  }

  if (searchParams.status === "offen") where.answeredAt = null;
  if (searchParams.status === "beantwortet") where.answeredAt = { not: null };

  if (searchParams.range && searchParams.range !== "vollständig") {
    const now = new Date();
    const from = new Date(now);
    if (searchParams.range === "heute") from.setHours(0, 0, 0, 0);
    else if (searchParams.range === "7 Tage") from.setDate(now.getDate() - 7);
    else if (searchParams.range === "30 Tage") from.setDate(now.getDate() - 30);
    where.publishedAt = { gte: from };
  }

  if (searchParams.location && searchParams.location !== "alle") {
    // nach Standort-Name filtern (Relation)
    where.location = { name: searchParams.location };
  }

  const cursorObj = decodeCursor(searchParams.cursor);

  const results = await prisma.review.findMany({
    where,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: take + 1, // +1 für „weitere laden“ Erkennung
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
      reviews={reviews}
      nextCursor={nextCursor}
      locationOptions={locationOptions}
      serverFilters={{
        rating: searchParams.rating ?? "alle",
        status: searchParams.status ?? "alle",
        range: searchParams.range ?? "vollständig",
        location: searchParams.location ?? "alle",
        take,
      }}
    />
  );
}
