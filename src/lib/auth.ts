// src/lib/auth.ts
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import { compare } from "bcrypt";
import { prisma } from "@/lib/prisma";
import { getTenantAndLocationsForUser } from "@/lib/tenancy";
import { TenantRole } from "@prisma/client"; // ✅ Enum aus deinem Schema

/**
 * Einheitliche Feldnamen (ENDZUSTAND):
 * - user/token: id, tenantId, role, locationIds, locationOptions
 */

const DEMO_TENANT_ID = "demo-tenant-id";
const DEMO_TENANT_SLUG = "demo";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null;
        const email = String(creds.email).toLowerCase();

        const user = await prisma.user.findUnique({
          where: { email },
          include: { memberships: { include: { tenant: true } } },
        });
        if (!user || !user.passwordHash) return null;

        const ok = await compare(String(creds.password), user.passwordHash);
        if (!ok) return null;

        // 1) Demo-Tenant sicherstellen (ohne plan → Default: BASIC)
        const demoTenant = await prisma.tenant.upsert({
          where: { id: DEMO_TENANT_ID },
          update: {},
          create: {
            id: DEMO_TENANT_ID,
            name: "Demo Tenant",
            slug: DEMO_TENANT_SLUG,
            // plan NICHT setzen → Default aus schema.prisma greift (BASIC)
          },
        });

        // 2) Membership des Users in diesem Tenant sicherstellen
        await prisma.membership.upsert({
          where: {
            userId_tenantId: { userId: user.id, tenantId: demoTenant.id },
          },
          update: {},
          create: {
            userId: user.id,
            tenantId: demoTenant.id,
            role: TenantRole.ADMIN, // ✅ enum-wert (ADMIN | EDITOR)
          },
        });

        // 3) Aktive Tenancy/Role für die Session
        const tenantId = demoTenant.id;
        const role = TenantRole.ADMIN;

        // 4) Erlaubte Locations für genau diesen Tenant ermitteln
        let locationIds: string[] = [];
        try {
          const accessRows = await prisma.locationAccess.findMany({
            where: { userId: user.id, location: { tenantId } },
            select: { locationId: true },
          });
          if (accessRows.length > 0) {
            locationIds = accessRows.map((r) => r.locationId);
          } else {
            const locs = await prisma.location.findMany({
              where: { tenantId },
              select: { id: true },
            });
            locationIds = locs.map((l) => l.id);
          }
        } catch {
          const locs = await prisma.location.findMany({
            where: { tenantId },
            select: { id: true },
          });
          locationIds = locs.map((l) => l.id);
        }

        // 5) UI-Optionen (id/label) für diesen Tenant
        const locationOptions = await prisma.location
          .findMany({
            where: { tenantId, ...(locationIds.length ? { id: { in: locationIds } } : {}) },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
          })
          .then((rows) => rows.map((r) => ({ id: r.id, label: r.name })));

        // 6) Objekt für JWT/Session
        return {
          id: user.id,
          email: user.email ?? undefined,
          name: user.name ?? undefined,
          tenantId,
          role,
          locationIds,
          locationOptions,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Login: Felder aus authorize → in den Token
      if (user) {
        (token as any).id = (user as any).id ?? token.sub;
        (token as any).tenantId = (user as any).tenantId;
        (token as any).role = (user as any).role;
        (token as any).locationIds = (user as any).locationIds ?? [];
        (token as any).locationOptions = (user as any).locationOptions ?? [];
      }

      // Fallback (z. B. andere Provider): Tenancy aus DB ziehen
      if (!(token as any).tenantId && token.sub) {
        try {
          const { tenantId, allowedLocationIds, locationOptions } =
            await getTenantAndLocationsForUser(token.sub);
          (token as any).tenantId = tenantId;
          (token as any).locationIds = allowedLocationIds ?? [];
          (token as any).locationOptions = locationOptions ?? [];
        } catch {}
      }

      return token;
    },
    async session({ session, token }) {
      (session.user as any).id = (token as any).id ?? token.sub;
      (session.user as any).tenantId = (token as any).tenantId;
      (session.user as any).role = (token as any).role;
      (session.user as any).locationIds = (token as any).locationIds ?? [];
      (session.user as any).locationOptions = (token as any).locationOptions ?? [];
      return session;
    },
  },
};

// ---- Helper für Server Components / Pages ----

export async function getSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const u = session.user as unknown as {
    id?: string;
    tenantId?: string;
    role?: TenantRole | string;
    locationIds?: string[];
    locationOptions?: { id: string; label: string }[];
  };

  if (!u?.id || !u?.tenantId) return null;

  return {
    userId: u.id,
    tenantId: u.tenantId,
    role: (u.role as any) ?? TenantRole.EDITOR,
    locationIds: Array.isArray(u.locationIds) ? u.locationIds : [],
    locationOptions: u.locationOptions ?? [],
    session,
  };
}

// Bequeme Alias-Helper:
export function getServerAuthSession() {
  return getServerSession(authOptions);
}
export const auth = getServerAuthSession;
