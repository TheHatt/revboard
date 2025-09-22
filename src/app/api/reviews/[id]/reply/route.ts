// src/app/(app)/reviews/[id]/reply/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type AiTone = "neutral" | "freundlich" | "formell" | "ausführlich" | "knapp";

// optional: falls du Caching vermeiden willst
// export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const reviewId = params.id;

  try {
    // 1) Session laden
    const session = await getServerSession(authOptions);
    const user = session?.user as
      | { id: string; tenantId: string; locationIds: string[] }
      | undefined;

    if (!user?.id || !user.tenantId) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    }

    // 2) Body lesen
    const body = (await req.json().catch(() => ({}))) as {
      text?: unknown;
      tone?: unknown;
    };

    const text =
      typeof body?.text === "string" ? body.text.trim() : "";
    const tone: AiTone | undefined =
      typeof body?.tone === "string" ? (body.tone as AiTone) : undefined;

    if (!text) {
      return NextResponse.json({ error: "Text fehlt" }, { status: 400 });
    }

    // 3) Review + Tenancy prüfen
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: {
        id: true,
        tenantId: true,
        locationId: true,
        reply: { select: { text: true } },
      },
    });

    if (!review) {
      return NextResponse.json({ error: "Review nicht gefunden" }, { status: 404 });
    }
    if (review.tenantId !== user.tenantId) {
      return NextResponse.json({ error: "Kein Zugriff (Tenant-Mismatch)" }, { status: 403 });
    }
    if (user.locationIds?.length && !user.locationIds.includes(review.locationId)) {
      return NextResponse.json({ error: "Kein Zugriff auf diesen Standort" }, { status: 403 });
    }
    if (review.reply) {
      return NextResponse.json(
        { error: "Bereits beantwortet", replyText: review.reply.text },
        { status: 409 }
      );
    }

    // 4) Extern posten (TODO Google Business) – bei Erfolg lokal speichern
    const postedAt = new Date();

    const reply = await prisma.reply.create({
      data: {
        reviewId: review.id,
        postedByUserId: user.id,
        type: tone ? "AUTO_AI" : "MANUAL",
        text,
        postedAt,
      },
    });

    await prisma.review.update({
      where: { id: review.id },
      data: { answeredAt: postedAt },
    });

    return NextResponse.json({
      ok: true,
      reviewId: review.id,
      replyText: reply.text,
      answeredAt: postedAt.toISOString(),
    });
  } catch (e) {
    console.error("[reply.POST]", e);
    return NextResponse.json({ error: "Unerwarteter Fehler" }, { status: 500 });
  }
}
