import { NextResponse } from "next/server";
import { requireSessionOr403 } from "@/lib/guards";

function requireAdminOr403(role: "viewer" | "editor" | "admin") {
  return role === "admin" ? null : { error: { status: 403, message: "Admin only" } as const };
}

export async function GET() {
  const s = await requireSessionOr403();
  if ("error" in s) return NextResponse.json({ error: s.error.message }, { status: s.error.status });
  const adminGuard = requireAdminOr403(s.session.role);
  if (adminGuard) return NextResponse.json({ error: adminGuard.error.message }, { status: adminGuard.error.status });

  // ... Einstellungen lesen ...
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const s = await requireSessionOr403();
  if ("error" in s) return NextResponse.json({ error: s.error.message }, { status: s.error.status });
  const adminGuard = requireAdminOr403(s.session.role);
  if (adminGuard) return NextResponse.json({ error: adminGuard.error.message }, { status: adminGuard.error.status });

  // ... Einstellungen speichern ...
  return NextResponse.json({ ok: true });
}
