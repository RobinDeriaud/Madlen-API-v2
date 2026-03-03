import type { NextAuthConfig } from "next-auth"

// Edge-compatible config: no Node.js-only imports (no bcryptjs, no prisma)
// Used by middleware.ts (Edge Runtime)
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard")
      if (isOnDashboard) return isLoggedIn
      return true
    },
  },
} satisfies NextAuthConfig
