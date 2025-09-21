// src/lib/auth.ts
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import { compare } from "bcrypt";
import { prisma } from "@/lib/prisma";

// Tipp: Ergänze zusätzlich die Typ-Augmentation in src/types/next-auth.d.ts (wie besprochen),
// damit TS session.user.id / token.tenantId etc. kennt.

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
          include: {
            memberships: {
              include: { tenant: true },
            },
          },
        });
        if (!user || !user.passwordHash) return null;

        const ok = await compare(String(creds.password), user.passwordHash);
        if (!ok) return null;

        // Mitgliedschaft wählen (einfach: erste)
        const membership = user.memberships?.[0];
        if (!membership) return null;

        const tenantId = membership.tenantId;
        const role = (membership?.role as "admin" | "editor" | "viewer") ?? "editor";

        // Erlaubte Locations: bevorzugt via LocationAccess; sonst alle Locations des Tenants
        let allowedLocationIds: string[] = [];
        try {
          const accessRows = await prisma.locationAccess.findMany({
            where: { userId: user.id, location: { tenantId } },
            select: { locationId: true },
          });
          if (accessRows.length > 0) {
            allowedLocationIds = accessRows.map((r) => r.locationId);
          } else {
            const locs = await prisma.location.findMany({
              where: { tenantId },
              select: { id: true },
            });
            allowedLocationIds = locs.map((l) => l.id);
          }
        } catch {
          // Falls es LocationAccess (noch) nicht gibt, fallback: alle Locations des Tenants
          const locs = await prisma.location.findMany({
            where: { tenantId },
            select: { id: true },
          });
          allowedLocationIds = locs.map((l) => l.id);
        }

        // Objekt, das in den JWT übernommen wird
        return {
          id: user.id,
          email: user.email ?? undefined,
          name: user.name ?? undefined,
          tenantId,
          role,
          allowedLocationIds,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Beim Login: zusätzliche Felder in den JWT legen
      if (user) {
        // token.sub enthält i. d. R. die User-ID automatisch
        (token as any).userId = (user as any).id;
        (token as any).tenantId = (user as any).tenantId;
        (token as any).role = (user as any).role;
        (token as any).allowedLocationIds = (user as any).allowedLocationIds ?? [];
      }
      return token;
    },
    async session({ session, token }) {
      // Werte aus dem JWT in die Session mappen
      if (session.user) {
        // Sichere ID-Zuweisung: bevorzugt token.sub, sonst userId
        (session.user as any).id = (token.sub as string) ?? (token as any).userId;
        (session.user as any).tenantId = (token as any).tenantId;
        (session.user as any).role = (token as any).role;
        (session.user as any).allowedLocationIds = (token as any).allowedLocationIds ?? [];
      }
      // Optionaler, älterer Shortcut – kannst du entfernen, wenn überall session.user.id genutzt wird:
      (session as any).userId = (token as any).userId ?? token.sub;

      return session;
    },
  },
  pages: {
    // signIn: "/login",
  },
  debug: process.env.NODE_ENV === "development",
};

// Helper: serverseitige Session abrufen und auf kompaktes Objekt mappen
export async function getSession() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const userId =
    (session as any).userId ??
    (session.user as any)?.id;

  const role = (session.user as any)?.role as "viewer" | "editor" | "admin" | undefined;
  const tenantId = (session.user as any)?.tenantId as string | undefined;
  const allowedLocationIds = (session.user as any)?.allowedLocationIds ?? [];

  if (!userId || !role || !tenantId) return null;
  return { userId, role, tenantId, allowedLocationIds };
}

// Optional: syntactic sugar, damit du in Server Components einfach `await auth()` nutzen kannst
export const auth = () => getServerSession(authOptions);
