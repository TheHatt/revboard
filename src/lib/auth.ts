// src/lib/auth.ts
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import { compare } from "bcrypt";
import { prisma } from "@/lib/prisma"; // <— sicherstellen, dass das dein Prisma-Client ist

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

        const membership = user.memberships?.[0];
        const tenantId = membership?.tenantId ?? "demo-tenant-id";
        const role = (membership?.role as "admin" | "editor" | "viewer") ?? "editor";
        const allowedLocationIds = (membership as any)?.allowedLocationIds ?? [];

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
      if (user) {
        token.userId = (user as any).id;
        token.tenantId = (user as any).tenantId;
        token.role = (user as any).role;
        token.allowedLocationIds = (user as any).allowedLocationIds ?? [];
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).userId = (token as any).userId;
      (session.user as any).id = token.sub;
      (session.user as any).tenantId = (token as any).tenantId;
      (session.user as any).role = (token as any).role;
      (session.user as any).allowedLocationIds = (token as any).allowedLocationIds ?? [];
      return session;
    },
  },
  pages: {
    // signIn: "/login",
  },
  debug: process.env.NODE_ENV === "development",
};

// Helper: serverseitige Session abrufen und auf unser kompaktes Objekt mappen
export async function getSession() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const userId = (session as any).userId ?? (session.user as any)?.id;
  const role = (session.user as any)?.role as "viewer" | "editor" | "admin" | undefined;
  const tenantId = (session.user as any)?.tenantId as string | undefined;
  const allowedLocationIds = (session.user as any)?.allowedLocationIds ?? [];
  if (!userId || !role || !tenantId) return null;

  return { userId, role, tenantId, allowedLocationIds };
}
