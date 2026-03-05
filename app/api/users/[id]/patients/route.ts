import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendPraticienConfirmationEmail } from "@/lib/mailer"
import { signPraticienConfirmJwt } from "@/lib/user-jwt"
import { z } from "zod"

// POST /api/users/[id]/patients — associe un patient au praticien
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id: rawId } = await params
  const userId = parseInt(rawId)
  if (isNaN(userId)) return Response.json({ error: "Invalid id" }, { status: 400 })

  const body = await req.json()
  const parsed = z.object({ userPatientId: z.number().int() }).safeParse(body)
  if (!parsed.success) return Response.json({ error: "Invalid input" }, { status: 400 })

  try {
    const praticien = await prisma.praticien.findUnique({
      where: { userId },
      include: { user: { select: { nom: true, prenom: true } } },
    })
    if (!praticien) return Response.json({ error: "Praticien introuvable" }, { status: 404 })

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

    // Envoyer l'email de confirmation si le praticien a changé
    let confirmationSent = false
    if (praticienChanged && patient.user?.email) {
      const token = await signPraticienConfirmJwt({
        patientUserId: parsed.data.userPatientId,
        praticienId: praticien.id,
      })
      const appUrl = process.env.APP_URL ?? "https://madlen.app"
      const confirmUrl = `${appUrl}/confirmer-praticien?token=${token}`
      const praticienNom = [praticien.user?.prenom, praticien.user?.nom]
        .filter(Boolean)
        .join(" ") || "Votre praticien"

      sendPraticienConfirmationEmail(patient.user.email, confirmUrl, praticienNom).catch(
        console.error
      )
      confirmationSent = true
    }

    return Response.json({ ok: true, patientId: patient.id, confirmationSent })
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
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id: rawId } = await params
  const userId = parseInt(rawId)
  if (isNaN(userId)) return Response.json({ error: "Invalid id" }, { status: 400 })

  const body = await req.json()
  const parsed = z.object({ patientId: z.number().int() }).safeParse(body)
  if (!parsed.success) return Response.json({ error: "Invalid input" }, { status: 400 })

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
