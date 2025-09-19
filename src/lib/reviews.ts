import { prisma } from "@/lib/prisma";

//
// 1) Reply speichern (für API)
//
type SaveReplyParams = {
  reviewId: string;
  tenantId: string;
  text: string;
  authorUserId?: string;
  allowEdit?: boolean; // default false: zweites Reply blocken
};

export async function saveReply({
  reviewId,
  tenantId,
  text,
  authorUserId,
  allowEdit = false,
}: SaveReplyParams) {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, tenantId: true, reply: { select: { id: true } } },
  });

  if (!review) return { error: { status: 404, message: "Review not found" } as const };
  if (review.tenantId !== tenantId) return { error: { status: 403, message: "Forbidden" } as const };
  if (!allowEdit && review.reply) {
    return { error: { status: 403, message: "Reply already exists" } as const };
  }

  const postedAt = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const reply = review.reply
      ? await tx.reply.update({
          where: { reviewId },
          data: { text, postedAt, postedByUserId: authorUserId ?? null },
          select: { text: true, postedAt: true },
        })
      : await tx.reply.create({
          data: {
            reviewId,
            text,
            postedAt,
            postedByUserId: authorUserId ?? null,
          },
          select: { text: true, postedAt: true },
        });

    await tx.review.update({
      where: { id: reviewId },
      data: { answeredAt: reply.postedAt },
    });

    return reply;
  });

  return { reply: { text: result.text, answeredAt: result.postedAt } } as const;
}

//
// 2) Reviews-Liste (Filter + Keyset-Pagination)
//
export type ReviewsQuery = {
  range?: string;     // "heute" | "7 Tage" | "30 Tage" | "vollständig"
  rating?: string;    // "1".."5" | "alle"
  status?: string;    // "offen" | "beantwortet" | "alle"
  location?: string;  // Standort-Name oder "alle"
  take?: string;      // Anzahl pro Seite
  cursor?: string;    // `${iso}_${id}`
};

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

export async function listReviews(tenantId: string, q: ReviewsQuery) {
  const take = Math.min(Math.max(Number(q.take ?? 12), 1), 50);

  const where: any = { tenantId };

  // Rating
  if (q.rating && q.rating !== "alle") {
    where.rating = Number(q.rating);
  }

  // Status
  if (q.status === "offen") where.answeredAt = null;
  if (q.status === "beantwortet") where.answeredAt = { not: null };

  // Zeitraum (publishedAt)
  if (q.range && q.range !== "vollständig") {
    const now = new Date();
    const from = new Date(now);
    if (q.range === "heute") from.setHours(0, 0, 0, 0);
    else if (q.range === "7 Tage") from.setDate(now.getDate() - 7);
    else if (q.range === "30 Tage") from.setDate(now.getDate() - 30);
    where.publishedAt = { gte: from };
  }

  // Standort (per Relation Location)
  if (q.location && q.location !== "alle") {
    where.location = { name: q.location };
  }

  const cursorObj = decodeCursor(q.cursor);

  const results = await prisma.review.findMany({
    where,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(cursorObj
        ? { cursor: { id: cursorObj.id }, skip: 1 }
        : {}),
    include: {
      location: { select: { name: true } },
      reply: { select: { text: true, postedAt: true } },
    },
  });

  const hasMore = results.length > take;
  const slice = results.slice(0, take);

  const items = slice.map((r) => ({
    id: r.id,
    author: r.authorName ?? "Anonym",
    initials: (r.authorName ?? "A N")
      .split(" ")
      .map((s) => s.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    stars: r.rating,
    text: r.text,
    location: r.location?.name ?? "—",
    publishedAt: r.publishedAt.toISOString(),
    answered: !!r.answeredAt,
    replyText: r.reply?.text ?? undefined,
  }));

  const nextCursor = hasMore
    ? encodeCursor(slice[slice.length - 1].publishedAt, slice[slice.length - 1].id)
    : undefined;

  return { items, nextCursor };
}
