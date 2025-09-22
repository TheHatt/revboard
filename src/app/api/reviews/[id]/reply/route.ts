// src/app/api/reviews/[id]/reply/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveReply } from "@/lib/reviews";
import {
  requireSessionOr403,
  requireEditorOrAdminOr403,
  checkLocationScopeOr403,
} from "@/lib/guards";

// WICHTIG: nur ein Argument (req: Request) – kein zweiter Parameter!
export const POST = async (req: Request) => {
  try {
    // ID aus URL parsen: /api/reviews/:id/reply
    const url = new URL(req.url);
    const match = url.pathname.match(/\/api\/reviews\/([^/]+)\/reply\/?$/);
    const reviewId = match?.[1];
    if (!reviewId) {
      return NextResponse.json({ error: "Invalid URL: review id missing" }, { status: 400 });
    }

    // Session & Rolle
    const s = await requireSessionOr403();
    if ("error" in s) {
      return NextResponse.json({ error: s.error.message }, { status: s.error.status });
    }
    const session = s.session;
    const roleGuard = requireEditorOrAdminOr403(session);
    if (roleGuard) {
      return NextResponse.json({ error: roleGuard.error.message }, { status: roleGuard.error.status });
    }

    // Body
    const { text } = (await req.json().catch(() => ({}))) as { text?: unknown };
    if (typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Preflight: Tenant- & Location-Scope prüfen
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { tenantId: true, locationId: true, reply: { select: { id: true } } },
    });
    if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });
    if (review.tenantId !== session.tenantId) {
      return NextResponse.json({ error: "Forbidden (tenant mismatch)" }, { status: 403 });
    }
    const locGuard = checkLocationScopeOr403(session, review.locationId);
    if (locGuard) {
      return NextResponse.json({ error: locGuard.error.message }, { status: locGuard.error.status });
    }
    if (review.reply) {
      return NextResponse.json({ error: "Already answered" }, { status: 409 });
    }

    // Speichern (setzt answeredAt, prüft Doppelantwort)
    const res = await saveReply({
      reviewId,
      tenantId: session.tenantId,
      text: text.trim(),
      authorUserId: session.userId,
      allowEdit: false,
    });

    if ("error" in res && res.error) {
      return NextResponse.json({ error: res.error.message }, { status: res.error.status });
    }

    return NextResponse.json({ reply: res.reply }, { status: 200 });
  } catch (err) {
    console.error("[api/reviews/[id]/reply] POST:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
};
