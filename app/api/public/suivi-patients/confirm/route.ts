import { requireUser } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { verifySuiviConfirmJwt } from "@/lib/user-jwt"
import { sendPraticienNotificationEmail } from "@/lib/mailer"
import { z } from "zod"

const schema = z.object({
  token: z.string().min(1),
})

export async function POST(req: Request) {
  const { userId, error } = await requireUser(req)
  if (error) return error

  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return Response.json({ error: "Token de confirmation requis" }, { status: 400 })

    const confirmPayload = await verifySuiviConfirmJwt(parsed.data.token)
    if (!confirmPayload) return Response.json({ error: "Token de confirmation invalide ou expiré" }, { status: 401 })

    // Verify the caller is the patient referenced in the token
    if (confirmPayload.patientUserId !== userId) {
      return Response.json({ error: "Ce lien ne vous est pas destiné" }, { status: 403 })
    }

    const suivi = await prisma.suiviPatient.findUnique({
      where: { id: confirmPayload.suiviPatientId },
      include: {
        patient: { include: { user: { select: { nom: true, prenom: true } } } },
        praticien: { include: { user: { select: { email: true, nom: true, prenom: true } } } },
      },
    })

    if (!suivi) return Response.json({ error: "Suivi introuvable" }, { status: 404 })

    // Already confirmed — idempotent
    if (suivi.isConfirmed) {
      return Response.json({ ok: true, alreadyConfirmed: true })
    }

    // Verify praticien hasn't changed since token was issued
    if (suivi.praticienId !== confirmPayload.praticienId) {
      return Response.json({ error: "Le praticien a changé depuis l'envoi du lien" }, { status: 409 })
    }

    await prisma.suiviPatient.update({
      where: { id: suivi.id },
      data: { isConfirmed: true, dateDebutSuivi: new Date() },
    })

    // Notify praticien
    const praticienEmail = suivi.praticien.user?.email
    const patientNom = [suivi.patient.user?.prenom, suivi.patient.user?.nom].filter(Boolean).join(" ") || "Un patient"

    if (praticienEmail) {
      sendPraticienNotificationEmail(praticienEmail, patientNom).catch(console.error)
    }

    return Response.json({ ok: true })
  } catch (err) {
    console.error("[POST /api/public/suivi-patients/confirm]", err)
    return Response.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
