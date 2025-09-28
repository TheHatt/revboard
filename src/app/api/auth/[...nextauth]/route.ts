import NextAuth from "next-auth"
// Variante A: mit Pfadalias "@/lib/auth"
import { authOptions } from "@/lib/auth"
import { getTenantAndLocationsForUser } from "@/lib/tenancy";

// Falls du (noch) keinen Pfadalias hast, nutze Variante B:
// import { authOptions } from "../../../../lib/auth"

const handler = NextAuth({
    ...authOptions,
    callbacks: {
      async jwt({ token, user }) {
        // Beim Login (oder wenn 'user' verfügbar) Tenancy in Token cachen
        if (user && !token.tid) {
          const { tenantId, allowedLocationIds, locationOptions } =
            await getTenantAndLocationsForUser((user as any).id);
          token.tid = tenantId;
          token.locs = allowedLocationIds;

        }
        return token;
      },
      async session({ session, token }) {
        // Pflichtfelder für unsere Pages:
        (session.user as any).id = (token as any).sub; // DB-User-ID
        (session.user as any).tenantId = (token as any).tid;
        (session.user as any).locationIds = (token as any).locs ?? [];
        return session;
      },
    },
  });
export { handler as GET, handler as POST };
