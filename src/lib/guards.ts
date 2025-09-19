import { getSession } from "@/lib/auth";

export type SessionShape = {
  userId: string;
  role: "viewer" | "editor" | "admin";
  tenantId: string;
  allowedLocationIds?: string[];
};

export async function requireSessionOr403():
  Promise<{ session: SessionShape } | { error: { status: 403; message: string } }> {
  const session = await getSession();
  if (!session) return { error: { status: 403, message: "Not authenticated" } };
  return { session };
}

export function requireEditorOrAdminOr403(session: SessionShape):
  | null
  | { error: { status: 403; message: string } } {
  if (session.role === "viewer") return { error: { status: 403, message: "Forbidden" } };
  return null;
}

export function checkLocationScopeOr403(session: SessionShape, locationId: string):
  | null
  | { error: { status: 403; message: string } } {
  const scope = session.allowedLocationIds ?? [];
  if (scope.length && !scope.includes(locationId)) {
    return { error: { status: 403, message: "Forbidden (location scope)" } };
  }
  return null;
}
