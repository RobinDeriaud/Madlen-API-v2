import { requireAdmin, parseId, handlePrismaError } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { sendListeActivatedEmail } from "@/lib/mailer"
import { zodFieldError } from "@/lib/validate"
import { z } from "zod"

const updateListeSchema = z.object({
  nom: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  exerciceIds: z.array(z.number().int()).optional(),
  notifyPatient: z.boolean().optional(),
})

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; listeId: string }> }
) {
  const { error } = await requireAdmin()
  if (error) return error

  const p = await params
  const { id: userId, error: idError } = parseId(p.id)
  if (idError) return idError
  const { id: lId, error: lError } = parseId(p.listeId)
  if (lError) return lError

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profil_patient: { select: { id: true } } },
    })
    if (!user?.profil_patient) return Response.json({ error: "Patient introuvable" }, { status: 404 })

    const liste = await prisma.liste.findFirst({
      where: { id: lId, patientId: user.profil_patient.id },
      include: {
        exercices: { select: { id: true, numero: true, nom: true, macro: true } },
      },
    })
    if (!liste) return Response.json({ error: "Liste introuvable" }, { status: 404 })

    return Response.json(liste)
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; listeId: string }> }
) {
  const { error } = await requireAdmin()
  if (error) return error

  const p = await params
  const { id: userId, error: idError } = parseId(p.id)
  if (idError) return idError
  const { id: lId, error: lError } = parseId(p.listeId)
  if (lError) return lError

  const body = await req.json()
  const parsed = updateListeSchema.safeParse(body)
  if (!parsed.success) return zodFieldError(parsed.error)

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profil_patient: { select: { id: true } } },
    })
    if (!user?.profil_patient) return Response.json({ error: "Patient introuvable" }, { status: 404 })

    const existing = await prisma.liste.findFirst({
      where: { id: lId, patientId: user.profil_patient.id },
    })
    if (!existing) return Response.json({ error: "Liste introuvable" }, { status: 404 })

    const { nom, date, isActive, exerciceIds, notifyPatient } = parsed.data
    const patientId = user.profil_patient.id

    const liste = await prisma.$transaction(async (tx) => {
      if (isActive === true) {
        await tx.liste.updateMany({
          where: { patientId, id: { not: lId } },
          data: { isActive: false },
        })
      }
      return tx.liste.update({
        where: { id: lId },
        data: {
          ...(nom !== undefined ? { nom } : {}),
          ...(date !== undefined ? { date: date ? new Date(date) : null } : {}),
          ...(isActive !== undefined ? { isActive } : {}),
          ...(exerciceIds !== undefined
            ? {
                exercices: {
                  set: exerciceIds.map((eid) => ({ id: eid })),
                },
              }
            : {}),
        },
        include: {
          exercices: { select: { id: true, numero: true, nom: true, macro: true } },
        },
      })
    })

    if (isActive === true && notifyPatient === true && user.email) {
      const patientNom = [user.prenom, user.nom].filter(Boolean).join(" ") || user.email
      const listeNom = liste.nom ?? "Sans nom"
      sendListeActivatedEmail(user.email, patientNom, listeNom, liste.date, liste.exercices).catch(() => {})
    }

    return Response.json({ id: liste.id })
  } catch (err) {
    return handlePrismaError(err, { P2025: "Liste introuvable" })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; listeId: string }> }
) {
  const { error } = await requireAdmin()
  if (error) return error

  const p = await params
  const { id: userId, error: idError } = parseId(p.id)
  if (idError) return idError
  const { id: lId, error: lError } = parseId(p.listeId)
  if (lError) return lError

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profil_patient: { select: { id: true } } },
    })
    if (!user?.profil_patient) return Response.json({ error: "Patient introuvable" }, { status: 404 })

    const existing = await prisma.liste.findFirst({
      where: { id: lId, patientId: user.profil_patient.id },
    })
    if (!existing) return Response.json({ error: "Liste introuvable" }, { status: 404 })

    await prisma.liste.delete({ where: { id: lId } })

    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
