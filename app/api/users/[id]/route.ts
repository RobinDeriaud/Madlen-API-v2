import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

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
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id: rawId } = await params
  const id = parseInt(rawId)
  if (isNaN(id)) return Response.json({ error: "Invalid id" }, { status: 400 })

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
    return Response.json(user)
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id: rawId } = await params
  const id = parseInt(rawId)
  if (isNaN(id)) return Response.json({ error: "Invalid id" }, { status: 400 })

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: "Invalid input" }, { status: 400 })

  const { profil_patient, profil_praticien, ...userFields } = parsed.data

  try {
    const user = await prisma.user.update({
      where: { id },
      data: userFields,
      include: { profil_patient: true, profil_praticien: true },
    })

    if (profil_patient != null) {
      if (user.profil_patient) {
        await prisma.patient.update({ where: { id: user.profil_patient.id }, data: profil_patient })
      } else {
        await prisma.patient.create({
          data: { ...profil_patient, userId: id },
        })
      }
    }

    if (profil_praticien != null) {
      if (user.profil_praticien) {
        await prisma.praticien.update({ where: { id: user.profil_praticien.id }, data: profil_praticien })
      } else {
        await prisma.praticien.create({
          data: { ...profil_praticien, userId: id },
        })
      }
    }

    const updated = await prisma.user.findUnique({
      where: { id },
      include: { profil_patient: true, profil_praticien: true },
    })
    return Response.json(updated)
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === "P2002") {
      return Response.json({ error: "Email ou username déjà utilisé" }, { status: 409 })
    }
    if (err instanceof Error && "code" in err && err.code === "P2025") {
      return Response.json({ error: "Not found" }, { status: 404 })
    }
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
