import { prisma } from "@/lib/prisma"
import { verifyUserJwt } from "@/lib/user-jwt"

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
  if (!token) return Response.json({ error: "Token manquant" }, { status: 401 })

  const payload = await verifyUserJwt(token)
  if (!payload) return Response.json({ error: "Token invalide ou expiré" }, { status: 401 })

  try {
    const exercices = await prisma.exercice.findMany({
      select: { id: true, nom: true, numero: true },
      orderBy: { numero: "asc" },
    })

    return Response.json({ data: exercices })
  } catch (err) {
    console.error("[GET /api/public/exercices/liste]", err)
    return Response.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
