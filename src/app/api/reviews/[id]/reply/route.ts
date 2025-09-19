import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type AiTone = "neutral" | "freundlich" | "formell" | "ausführlich" | "knapp";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const reviewId = params.id;
    const body = await req.json();
    const text = String(body?.text ?? "").trim();
    const tone: AiTone | undefined = body?.tone;

    if (!text) {
      return NextResponse.json({ error: "Text fehlt" }, { status: 400 });
    }

    // TODO: Auth / tenant check
    const review = await prisma.review.findUnique({ where: { id: reviewId }, include: { reply: true } });
    if (!review) return NextResponse.json({ error: "Review nicht gefunden" }, { status: 404 });
    if (review.reply) return NextResponse.json({ error: "Bereits beantwortet", replyText: review.reply.text }, { status: 409 });

    const postedAt = new Date();

    // TODO: Google Business API call — bei Erfolg unten speichern
    const reply = await prisma.reply.create({
      data: {
        reviewId,
        postedByUserId: null, // TODO: aus Auth
        type: tone ? "AUTO_AI" : "MANUAL",
        text,
        postedAt,
      },
    });

    await prisma.review.update({
      where: { id: reviewId },
      data: { answeredAt: postedAt }, // falls du answeredAt im Schema hast
    });

    return NextResponse.json({ ok: true, reviewId, replyText: reply.text, answeredAt: postedAt.toISOString() });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Unerwarteter Fehler" }, { status: 500 });
  }
}
