// middleware.ts
// Edge runtime is enforced here by Next.js.  Avoid importing any
// module that relies on Node.js (bcryptjs, prisma, crypto, etc.).
// We keep this file minimal and use the lightweight config previously
// defined in `auth.config.ts` (no providers, no DB access).

import NextAuth from "next-auth"
import { authConfig } from "@/auth.config"

// `NextAuth(authConfig)` returns an object; we only take the `auth`
// handler which is a plain function.  Exporting it directly as the
// default ensures Next.js recognizes the middleware correctly.
const nextAuthMiddleware = NextAuth(authConfig).auth

export default nextAuthMiddleware

export const config = {
  matcher: ["/dashboard/:path*", "/api-docs", "/api/swagger"],
}
