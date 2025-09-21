// src/lib/tenancy.ts
import { prisma } from "@/lib/prisma";

/**
 * Leitet für einen eingeloggten User den aktiven Tenant und erlaubte Locations ab.
 * Strategie:
 * - Hat der User genau 1 Membership? -> diesen Tenant nehmen.
 * - Hat er mehrere Memberships? -> wähle den Tenant, für den es LocationAccess gibt; sonst erste Membership.
 * - Locations:
 *    • Wenn LocationAccess für den gewählten Tenant existiert -> nur diese IDs
 *    • Sonst: alle Locations des Tenants
 */
export async function getTenantAndLocationsForUser(
  userId: string,
  opts?: { activeTenantId?: string | null } // optional: falls du den aktiven Tenant schon aus Session/Subdomain hast
) {
  // 1) Tenant bestimmen
  let tenantId = opts?.activeTenantId ?? null;

  if (!tenantId) {
    const memberships = await prisma.membership.findMany({
      where: { userId },
      select: { tenantId: true },
      orderBy: { tenantId: "asc" }, // deterministisch
    });

    if (memberships.length === 0) {
      throw new Error("User hat keine Membership – kein Tenant zugeordnet.");
    }

    if (memberships.length === 1) {
      tenantId = memberships[0].tenantId;
    } else {
      // Mehrere Tenants: bevorzuge den, für den es LocationAccess gibt
      const access = await prisma.locationAccess.findMany({
        where: { userId },
        select: { locationId: true, location: { select: { tenantId: true } } },
      });
      const tenantIdsWithAccess = new Set(access.map(a => a.location.tenantId));
      const preferred = memberships.find(m => tenantIdsWithAccess.has(m.tenantId));
      tenantId = preferred?.tenantId ?? memberships[0].tenantId;
    }
  }

  // 2) Erlaubte Locations für diesen Tenant bestimmen
  const directAccess = await prisma.locationAccess.findMany({
    where: { userId, location: { tenantId } },
    select: { locationId: true, location: { select: { name: true } } },
    orderBy: { locationId: "asc" },
  });

  let allowedLocationIds: string[] = [];
  let locationOptions: { id: string; label: string }[] = [];

  if (directAccess.length > 0) {
    allowedLocationIds = directAccess.map(a => a.locationId);
    locationOptions = directAccess.map(a => ({ id: a.locationId, label: a.location.name }));
  } else {
    // Kein expliziter LocationAccess: alle Locations des Tenants erlauben
    const locations = await prisma.location.findMany({
      where: { tenantId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    allowedLocationIds = locations.map(l => l.id);
    locationOptions = locations.map(l => ({ id: l.id, label: l.name }));
  }

  return { tenantId: tenantId!, allowedLocationIds, locationOptions };
}
