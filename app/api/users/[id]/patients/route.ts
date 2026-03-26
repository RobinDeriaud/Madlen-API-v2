import { requireAdmin, parseId } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { sendPraticienConfirmationEmail, sendPatientSetupEmail } from "@/lib/mailer"
import { signPraticienConfirmJwt, signPatientSetupJwt } from "@/lib/user-jwt"
import { zodFieldError } from "@/lib/validate"
import { z } from "zod"

// POST /api/users/[id]/patients — associe un patient au praticien
//
// Deux cas d'envoi d'email :
// 1. Le patient n'a PAS encore de mot de passe (passwordHash === "!SETUP_PENDING")
//    → envoi de l'email "patient-setup" avec lien vers /configurer-compte
//    → quand le patient finalise, l'affiliation praticien est auto-confirmée
// 2. Le patient a DÉJÀ un mot de passe (compte existant)
//    → envoi de l'email classique "praticien-confirmation" avec lien vers /confirmer-praticien
//
// Réutilisable hors admin panel : POST /api/users/{praticienUserId}/patients
// avec body { userPatientId: number }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id: userId, error: idError } = parseId((await params).id)
  if (idError) return idError

  const body = await req.json()
  const parsed = z.object({ userPatientId: z.number().int() }).safeParse(body)
  if (!parsed.success) return zodFieldError(parsed.error)

  try {
    const praticien = await prisma.praticien.findUnique({
      where: { userId },
      include: { user: { select: { nom: true, prenom: true } } },
    })
    if (!praticien) return Response.json({ error: "Praticien introuvable" }, { status: 404 })

    // Récupérer le user pour savoir s'il a un mot de passe
    const patientUser = await prisma.user.findUnique({
      where: { id: parsed.data.userPatientId },
      select: { passwordHash: true },
    })
    if (!patientUser) return Response.json({ error: "Utilisateur introuvable" }, { status: 404 })

    const needsSetup = patientUser.passwordHash === "!SETUP_PENDING"

    // Crée le profil patient si inexistant, sinon met à jour praticienId
    let patient = await prisma.patient.findUnique({
      where: { userId: parsed.data.userPatientId },
      include: { user: { select: { email: true } } },
    })

    const praticienChanged = patient ? patient.praticienId !== praticien.id : true

    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          userId: parsed.data.userPatientId,
          praticienId: praticien.id,
          praticienConfirmStatus: "PENDING",
        },
        include: { user: { select: { email: true } } },
      })
    } else if (praticienChanged) {
      patient = await prisma.patient.update({
        where: { id: patient.id },
        data: { praticienId: praticien.id, praticienConfirmStatus: "PENDING" },
        include: { user: { select: { email: true } } },
      })
    }

    // Envoyer l'email approprié
    let emailSent = false
    if (praticienChanged && patient.user?.email) {
      const appUrl = process.env.APP_URL ?? "https://madlen.app"
      const praticienNom = [praticien.user?.prenom, praticien.user?.nom]
        .filter(Boolean)
        .join(" ") || "Votre praticien"

      if (needsSetup) {
        // Compte sans mot de passe → email de setup (auto-confirm praticien à la fin)
        const token = await signPatientSetupJwt({
          patientUserId: parsed.data.userPatientId,
          praticienId: praticien.id,
        })
        const setupUrl = `${appUrl}/configurer-compte?token=${token}`
        sendPatientSetupEmail(patient.user.email, setupUrl, praticienNom).catch(console.error)
      } else {
        // Compte existant → email de confirmation praticien classique
        const token = await signPraticienConfirmJwt({
          patientUserId: parsed.data.userPatientId,
          praticienId: praticien.id,
        })
        const confirmUrl = `${appUrl}/confirmer-praticien?token=${token}`
        sendPraticienConfirmationEmail(patient.user.email, confirmUrl, praticienNom).catch(
          console.error
        )
      }
      emailSent = true
    }

    return Response.json({ ok: true, patientId: patient.id, emailSent, needsSetup })
  } catch (err) {
    console.error("[POST /api/users/[id]/patients]", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/users/[id]/patients — dissocie un patient du praticien
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id: userId, error: idError } = parseId((await params).id)
  if (idError) return idError

  const body = await req.json()
  const parsed = z.object({ patientId: z.number().int() }).safeParse(body)
  if (!parsed.success) return zodFieldError(parsed.error)

  try {
    const praticien = await prisma.praticien.findUnique({ where: { userId } })
    if (!praticien) return Response.json({ error: "Praticien introuvable" }, { status: 404 })

    await prisma.patient.updateMany({
      where: { id: parsed.data.patientId, praticienId: praticien.id },
      data: { praticienId: null, praticienConfirmStatus: "PENDING" },
    })

    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
