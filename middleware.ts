// middleware.ts
// Next 16+ expects a plain function export; avoid destructuring
// directly from NextAuth here. Instead re‑use the helper from
// `lib/auth.ts` which already exports `auth`.

export { auth as middleware } from "@/lib/auth"

export const config = {
  matcher: ["/dashboard/:path*"],
}
