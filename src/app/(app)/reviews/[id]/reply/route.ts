import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveReply } from "@/lib/reviews";
import {
  requireSessionOr403,
  requireEditorOrAdminOr403,
  checkLocationScopeOr403,
} from "@/lib/guards";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
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
    const { text } = await req.json().catch(() => ({} as any));
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Preflight: Tenant- & Location-Scope prüfen (leichtgewichtige Selects)
    const review = await prisma.review.findUnique({
      where: { id: params.id },
      select: { tenantId: true, locationId: true },
    });
    if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });
    if (review.tenantId !== session.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const locGuard = checkLocationScopeOr403(session, review.locationId);
    if (locGuard) {
      return NextResponse.json({ error: locGuard.error.message }, { status: locGuard.error.status });
    }

    // Speichern (setzt answeredAt, prüft 2. Reply)
    const res = await saveReply({
      reviewId: params.id,
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
    console.error(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
