import { requireAdmin, parseId } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { zodFieldError } from "@/lib/validate"
import { z } from "zod"

const createListeSchema = z.object({
  nom: z.string().optional(),
  date: z.string().optional().nullable(),
  exerciceIds: z.array(z.number().int()).default([]),
})

async function getOrCreatePatientId(userId: number): Promise<number | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { user_type: true, profil_patient: { select: { id: true } } },
  })
  if (!user) return null
  if (user.profil_patient) return user.profil_patient.id
  if (user.user_type !== "PATIENT") return null
  const created = await prisma.patient.create({ data: { userId } })
  return created.id
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id: userId, error: idError } = parseId((await params).id)
  if (idError) return idError

  try {
    const patientId = await getOrCreatePatientId(userId)
    if (patientId === null) return Response.json({ error: "Cet utilisateur n'est pas un patient" }, { status: 400 })

    const listes = await prisma.liste.findMany({
      where: { patientId },
      include: {
        exercices: { select: { id: true, numero: true, nom: true, macro: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return Response.json(listes)
  } catch (err) {
    console.error("[GET /api/users/[id]/listes]", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id: userId, error: idError } = parseId((await params).id)
  if (idError) return idError

  const body = await req.json()
  const parsed = createListeSchema.safeParse(body)
  if (!parsed.success) return zodFieldError(parsed.error)

  try {
    const patientId = await getOrCreatePatientId(userId)
    if (patientId === null) return Response.json({ error: "Cet utilisateur n'est pas un patient" }, { status: 400 })

    const { nom, date, exerciceIds } = parsed.data
    const liste = await prisma.liste.create({
      data: {
        nom: nom || null,
        date: date ? new Date(date) : null,
        patientId,
        exercices: exerciceIds.length > 0
          ? { connect: exerciceIds.map((eid) => ({ id: eid })) }
          : undefined,
      },
    })

    return Response.json({ id: liste.id }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/users/[id]/listes]", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
