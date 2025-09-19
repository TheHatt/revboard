import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login", // wohin, wenn nicht eingeloggt
  },
  // optional: role-basierte Logik
  // callbacks: {
  //   authorized: ({ token }) => token?.role !== "viewer",
  // },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/locations/:path*",
    "/reviews/:path*",
    "/statistiken/:path*",
    "/support/:path*",
    "/einstellungen/:path*",
  ],
};