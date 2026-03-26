import { auth } from "@/lib/auth"
import { verifyUserJwt } from "@/lib/user-jwt"
import type { Session } from "next-auth"

// ─── Admin auth guard (NextAuth) ────────────────────────────────────────────

type AdminResult =
  | { session: Session; error?: never }
  | { session?: never; error: Response }

export async function requireAdmin(): Promise<AdminResult> {
  const session = await auth()
  if (!session) {
    return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  return { session: session as Session }
}

// ─── Public JWT auth guard ──────────────────────────────────────────────────

type UserResult =
  | { userId: number; error?: never }
  | { userId?: never; error: Response }

export async function requireUser(req: Request): Promise<UserResult> {
  const authHeader = req.headers.get("authorization")
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
  if (!token) {
    return { error: Response.json({ error: "Token manquant" }, { status: 401 }) }
  }
  const payload = await verifyUserJwt(token)
  if (!payload) {
    return { error: Response.json({ error: "Token invalide ou expiré" }, { status: 401 }) }
  }
  const userId = parseInt(payload.sub)
  if (!userId || isNaN(userId)) {
    return { error: Response.json({ error: "Token invalide" }, { status: 401 }) }
  }
  return { userId }
}

// ─── Route param ID parser ──────────────────────────────────────────────────

type IdResult =
  | { id: number; error?: never }
  | { id?: never; error: Response }

export function parseId(rawId: string): IdResult {
  const id = parseInt(rawId)
  if (isNaN(id)) {
    return { error: Response.json({ error: "Invalid id" }, { status: 400 }) }
  }
  return { id }
}

// ─── Safe JSON body parser ──────────────────────────────────────────────────

type BodyResult =
  | { body: unknown; error?: never }
  | { body?: never; error: Response }

export async function parseBody(req: Request): Promise<BodyResult> {
  try {
    const body = await req.json()
    return { body }
  } catch {
    return { error: Response.json({ error: "Invalid JSON" }, { status: 400 }) }
  }
}

// ─── Prisma error handler ───────────────────────────────────────────────────

export function handlePrismaError(
  err: unknown,
  overrides?: { P2002?: string; P2025?: string }
): Response {
  if (err instanceof Error && "code" in err) {
    if (err.code === "P2002") {
      return Response.json(
        { error: overrides?.P2002 ?? "Conflit de données" },
        { status: 409 }
      )
    }
    if (err.code === "P2025") {
      return Response.json(
        { error: overrides?.P2025 ?? "Ressource introuvable" },
        { status: 404 }
      )
    }
  }
  return Response.json({ error: "Erreur interne" }, { status: 500 })
}
