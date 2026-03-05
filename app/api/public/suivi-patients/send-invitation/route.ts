import { prisma } from "@/lib/prisma"
import { verifyUserJwt } from "@/lib/user-jwt"
import { sendInvitationEmail } from "@/lib/mailer"
import { z } from "zod"

const schema = z.object({
  patientEmail: z.string().email(),
})

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization")
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
  if (!token) return Response.json({ error: "Token manquant" }, { status: 401 })

  const payload = await verifyUserJwt(token)
  if (!payload) return Response.json({ error: "Token invalide ou expiré" }, { status: 401 })

  try {
    const userId = parseInt(payload.sub)
    if (!userId || isNaN(userId)) return Response.json({ error: "Token invalide" }, { status: 401 })

    const praticien = await prisma.praticien.findUnique({
      where: { userId },
      include: { user: { select: { nom: true, prenom: true } } },
    })
    if (!praticien) return Response.json({ error: "Seul un praticien peut envoyer une invitation" }, { status: 403 })

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return Response.json({ error: "Email invalide" }, { status: 400 })

    const praticienNom = [praticien.user?.prenom, praticien.user?.nom].filter(Boolean).join(" ") || "Votre praticien"
    const appUrl = process.env.NEXTAUTH_URL ?? "https://madlen.app"
    const registerUrl = `${appUrl}/inscription`

    sendInvitationEmail(parsed.data.patientEmail, registerUrl, praticienNom).catch(console.error)

    return Response.json({ ok: true })
  } catch (err) {
    console.error("[POST /api/public/suivi-patients/send-invitation]", err)
    return Response.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
