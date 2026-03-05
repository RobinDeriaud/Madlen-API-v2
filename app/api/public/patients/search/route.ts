import { prisma } from "@/lib/prisma"
import { verifyUserJwt } from "@/lib/user-jwt"

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
  if (!token) return Response.json({ error: "Token manquant" }, { status: 401 })

  const payload = await verifyUserJwt(token)
  if (!payload) return Response.json({ error: "Token invalide ou expiré" }, { status: 401 })

  try {
    const url = new URL(req.url)
    const email = url.searchParams.get("email")
    if (!email) return Response.json({ error: "Paramètre email requis" }, { status: 400 })

    const patient = await prisma.patient.findFirst({
      where: { user: { email } },
      include: {
        user: { select: { id: true, email: true, nom: true, prenom: true } },
      },
    })

    if (!patient) return Response.json({ data: [] })

    return Response.json({ data: [patient] })
  } catch (err) {
    console.error("[GET /api/public/patients/search]", err)
    return Response.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
