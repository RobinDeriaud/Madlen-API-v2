import { requireAdmin, parseId, handlePrismaError } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { zodFieldError } from "@/lib/validate"
import { z } from "zod"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stripSensitive(user: any) {
  if (!user) return user
  const { passwordHash, passwordResetToken, passwordResetExpiry, emailConfirmToken, emailConfirmExpiry, emailChangeToken, emailChangeNewEmail, emailChangeExpiry, ...safe } = user
  return safe
}

const updateSchema = z.object({
  email: z.string().email().optional(),
  nom: z.string().nullable().optional(),
  prenom: z.string().nullable().optional(),
  confirmed: z.boolean().optional(),
  user_type: z.enum(["NONE", "PATIENT", "PRATICIEN"]).optional(),
  profil_patient: z
    .object({
      age: z.number().int().nullable().optional(),
      sexe: z.enum(["FEMININ", "MASCULIN"]).nullable().optional(),
    })
    .nullable()
    .optional(),
  profil_praticien: z
    .object({
      numero_adeli: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
})

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id, error: idError } = parseId((await params).id)
  if (idError) return idError

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        profil_patient: {
          include: {
            praticien: {
              include: {
                user: { select: { id: true, nom: true, prenom: true, email: true } },
              },
            },
          },
        },
        profil_praticien: {
          include: {
            patients: {
              include: {
                user: { select: { id: true, nom: true, prenom: true, email: true, confirmed: true } },
              },
              orderBy: [{ user: { nom: "asc" } }, { user: { prenom: "asc" } }],
            },
          },
        },
      },
    })
    if (!user) return Response.json({ error: "Not found" }, { status: 404 })
    return Response.json(stripSensitive(user))
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id, error: idError } = parseId((await params).id)
  if (idError) return idError

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { profil_patient: true, profil_praticien: true },
    })
    if (!user) return Response.json({ error: "Not found" }, { status: 404 })

    if (user.profil_patient) {
      await prisma.liste.deleteMany({ where: { patientId: user.profil_patient.id } })
      await prisma.patient.delete({ where: { id: user.profil_patient.id } })
    }

    if (user.profil_praticien) {
      await prisma.patient.updateMany({
        where: { praticienId: user.profil_praticien.id },
        data: { praticienId: null },
      })
      await prisma.praticien.delete({ where: { id: user.profil_praticien.id } })
    }

    await prisma.user.delete({ where: { id } })
    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id, error: idError } = parseId((await params).id)
  if (idError) return idError

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return zodFieldError(parsed.error)

  const { profil_patient, profil_praticien, ...userFields } = parsed.data

  try {
    const user = await prisma.user.update({
      where: { id },
      data: userFields,
      include: { profil_patient: true, profil_praticien: true },
    })

    // Upsert profil_patient
    if (profil_patient != null) {
      if (user.profil_patient) {
        await prisma.patient.update({ where: { id: user.profil_patient.id }, data: profil_patient })
      } else {
        await prisma.patient.create({ data: { ...profil_patient, userId: id } })
      }
    } else if (userFields.user_type === "PATIENT" && !user.profil_patient) {
      // Auto-create empty patient profile when role is set to PATIENT
      await prisma.patient.create({ data: { userId: id } })
    }

    // Upsert profil_praticien
    if (profil_praticien != null) {
      if (user.profil_praticien) {
        await prisma.praticien.update({ where: { id: user.profil_praticien.id }, data: profil_praticien })
      } else {
        await prisma.praticien.create({ data: { ...profil_praticien, userId: id } })
      }
    } else if (userFields.user_type === "PRATICIEN" && !user.profil_praticien) {
      // Auto-create empty praticien profile when role is set to PRATICIEN
      await prisma.praticien.create({ data: { userId: id } })
    }

    const updated = await prisma.user.findUnique({
      where: { id },
      include: { profil_patient: true, profil_praticien: true },
    })
    return Response.json(stripSensitive(updated))
  } catch (err) {
    return handlePrismaError(err, { P2002: "Email ou username déjà utilisé" })
  }
}
