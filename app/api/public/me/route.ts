import { prisma } from "@/lib/prisma"
import { verifyUserJwt, normalizeUser } from "@/lib/user-jwt"

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null

  if (!token) {
    return Response.json({ error: "Token manquant" }, { status: 401 })
  }

  const payload = await verifyUserJwt(token)
  if (!payload) {
    return Response.json({ error: "Token invalide ou expiré" }, { status: 401 })
  }

  try {
    const userId = parseInt(payload.sub)
    if (!userId || isNaN(userId)) {
      return Response.json({ error: "Token invalide" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profil_patient: true, profil_praticien: true },
    })

    if (!user) {
      return Response.json({ error: "Utilisateur introuvable" }, { status: 404 })
    }

    return Response.json(normalizeUser(user))
  } catch (err) {
    console.error("[GET /api/public/me]", err)
    return Response.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
