import { requireUser } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { normalizeUser } from "@/lib/user-jwt"

export async function GET(req: Request) {
  const { userId, error } = await requireUser(req)
  if (error) return error

  try {
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
