import { requireUser } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { signSuiviConfirmJwt } from "@/lib/user-jwt"
import { sendPraticienConfirmationEmail } from "@/lib/mailer"
import { z } from "zod"

const schema = z.object({
  suiviPatientId: z.number().int().positive(),
})

export async function POST(req: Request) {
  const { userId, error } = await requireUser(req)
  if (error) return error

  try {

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return Response.json({ error: "Données invalides" }, { status: 400 })

    const suivi = await prisma.suiviPatient.findUnique({
      where: { id: parsed.data.suiviPatientId },
      include: {
        praticien: { include: { user: { select: { nom: true, prenom: true } } } },
        patient: { include: { user: { select: { id: true, email: true } } } },
      },
    })

    if (!suivi) return Response.json({ error: "Suivi introuvable" }, { status: 404 })
    if (suivi.praticien.userId !== userId) return Response.json({ error: "Accès refusé" }, { status: 403 })

    const patientEmail = suivi.patient.user?.email
    if (!patientEmail) return Response.json({ error: "Patient sans email" }, { status: 400 })

    const praticienNom = [suivi.praticien.user?.prenom, suivi.praticien.user?.nom].filter(Boolean).join(" ") || "Votre praticien"

    const confirmToken = await signSuiviConfirmJwt({
      suiviPatientId: suivi.id,
      patientUserId: suivi.patient.user!.id,
      praticienId: suivi.praticienId,
    })

    const appUrl = process.env.APP_URL ?? "https://madlen.app"
    const confirmUrl = `${appUrl}/confirmer-suivi?token=${confirmToken}`

    sendPraticienConfirmationEmail(patientEmail, confirmUrl, praticienNom).catch(console.error)

    return Response.json({ ok: true })
  } catch (err) {
    console.error("[POST /api/public/suivi-patients/send-confirmation]", err)
    return Response.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
