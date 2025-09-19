import NextAuth from "next-auth"

// Variante A: mit Pfadalias "@/lib/auth"
import { authOptions } from "@/lib/auth"

// Falls du (noch) keinen Pfadalias hast, nutze Variante B:
// import { authOptions } from "../../../../lib/auth"

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
