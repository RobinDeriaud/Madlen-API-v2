import { requireUser } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { normalizeUser } from "@/lib/user-jwt"
import { zodFieldError } from "@/lib/validate"
import { z } from "zod"

const updateSchema = z.object({
  nom: z.string().nullable().optional(),
  prenom: z.string().nullable().optional(),
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

export async function PUT(req: Request) {
  const { userId, error } = await requireUser(req)
  if (error) return error

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return zodFieldError(parsed.error)

  const { profil_patient, profil_praticien, ...userFields } = parsed.data

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profil_patient: true, profil_praticien: true },
    })

    if (!user) {
      return Response.json({ error: "Utilisateur introuvable" }, { status: 404 })
    }

    // Update user fields (nom, prenom)
    const hasUserFields = Object.keys(userFields).length > 0
    if (hasUserFields) {
      await prisma.user.update({ where: { id: userId }, data: userFields })
    }

    // Update patient profile if provided and user has one
    if (profil_patient != null && user.profil_patient) {
      await prisma.patient.update({
        where: { id: user.profil_patient.id },
        data: profil_patient,
      })
    }

    // Update praticien profile if provided and user has one
    if (profil_praticien != null && user.profil_praticien) {
      await prisma.praticien.update({
        where: { id: user.profil_praticien.id },
        data: profil_praticien,
      })
    }

    // Return updated user with profiles
    const updated = await prisma.user.findUnique({
      where: { id: userId },
      include: { profil_patient: true, profil_praticien: true },
    })

    return Response.json(normalizeUser(updated!))
  } catch (err) {
    console.error("[PUT /api/public/profile]", err)
    return Response.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
