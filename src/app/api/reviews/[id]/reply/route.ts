// src/app/api/reviews/[id]/reply/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveReply } from "@/lib/reviews";
import { replyBodySchema, type ReplyBody } from "@/lib/schemas";
import {
  requireSessionOr403,
  requireEditorOrAdminOr403,
  checkLocationScopeOr403,
} from "@/lib/guards";

// WICHTIG: nur ein Argument (req: Request) – kein zweiter Parameter!
export const POST = async (req: Request) => {
  try {
    // id aus url …
    const url = new URL(req.url);
    const match = url.pathname.match(/\/api\/reviews\/([^/]+)\/reply\/?$/);
    const reviewId = match?.[1];
    if (!reviewId) {
      return NextResponse.json({ error: { code: "BAD_URL", message: "Invalid URL: review id missing" } }, { status: 400 });
    }

    // session/rolle …
    const s = await requireSessionOr403();
    if ("error" in s) {
      return NextResponse.json({ error: { code: "AUTH", message: s.error.message } }, { status: s.error.status });
    }
    const session = s.session;
    const roleGuard = requireEditorOrAdminOr403(session);
    if (roleGuard) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: roleGuard.error.message } }, { status: roleGuard.error.status });
    }

    // ✅ Zod-Validation
    const json = (await req.json().catch(() => ({}))) as unknown;
    const parsed = replyBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: parsed.error.issues.map(e => e.message).join(", ") } },
        { status: 400 }
      );
    }
    const { text } = parsed.data as ReplyBody;

    // scope checks …
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { tenantId: true, locationId: true, reply: { select: { id: true, text: true } } },
    });
    if (!review) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Review not found" } }, { status: 404 });
    if (review.tenantId !== session.tenantId) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Forbidden (tenant mismatch)" } }, { status: 403 });
    }
    const locGuard = checkLocationScopeOr403(session, review.locationId);
    if (locGuard) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: locGuard.error.message } }, { status: locGuard.error.status });
    }
    if (review.reply) {
      return NextResponse.json({ error: { code: "CONFLICT", message: "Already answered" } }, { status: 409 });
    }

    // speichern …
    const res = await saveReply({
      reviewId,
      tenantId: session.tenantId,
      text: text.trim(),
      authorUserId: session.userId,
      allowEdit: false,
    });
    if ("error" in res && res.error) {
      return NextResponse.json({ error: { code: "SAVE_FAILED", message: res.error.message } }, { status: res.error.status });
    }

    return NextResponse.json({ reply: res.reply }, { status: 200 });
  } catch (err) {
    console.error("[api/reviews/[id]/reply] POST:", err);
    return NextResponse.json({ error: { code: "INTERNAL", message: "Internal Server Error" } }, { status: 500 });
  }
};
