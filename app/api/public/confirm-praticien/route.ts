import { prisma } from "@/lib/prisma"
import { verifyPraticienConfirmJwt } from "@/lib/user-jwt"
import { sendPraticienNotificationEmail } from "@/lib/mailer"
import { z } from "zod"

const schema = z.object({ token: z.string().min(1) })

// POST /api/public/confirm-praticien — le patient confirme son praticien via le lien reçu par email
export async function POST(req: Request) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return Response.json({ error: "Token manquant" }, { status: 400 })

  const payload = await verifyPraticienConfirmJwt(parsed.data.token)
  if (!payload) return Response.json({ error: "Lien invalide ou expiré" }, { status: 401 })

  try {
    const patient = await prisma.patient.findUnique({
      where: { userId: payload.patientUserId },
      include: {
        user: { select: { nom: true, prenom: true } },
        praticien: { include: { user: { select: { email: true } } } },
      },
    })

    if (!patient) return Response.json({ error: "Patient introuvable" }, { status: 404 })

    // Vérifier que le praticien dans le token correspond au praticien actuel
    if (patient.praticienId !== payload.praticienId) {
      return Response.json({ error: "Ce lien ne correspond plus au praticien actuel" }, { status: 409 })
    }

    if (patient.praticienConfirmStatus === "CONFIRMED") {
      return Response.json({ ok: true, alreadyConfirmed: true })
    }

    await prisma.patient.update({
      where: { id: patient.id },
      data: { praticienConfirmStatus: "CONFIRMED" },
    })

    // Notifier le praticien par email (non-bloquant)
    const praticienEmail = patient.praticien?.user?.email
    if (praticienEmail) {
      const patientNom = [patient.user?.prenom, patient.user?.nom].filter(Boolean).join(" ") || "Votre patient"
      sendPraticienNotificationEmail(praticienEmail, patientNom).catch(console.error)
    }

    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
