import { requireAdmin, handlePrismaError } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { zodFieldError } from "@/lib/validate"
import { z } from "zod"

const MacroExerciceEnum = z.enum([
  "AJUSTEMENT_100",
  "HYGIENE_PHONATOIRE_200",
  "PRAXIES_300",
  "RENDEMENT_VOCAL_400",
  "FLEXIBILITE_VOCALE_500",
  "INTELLIGIBILITE_600",
  "FLUENCE_700",
])

const createSchema = z.object({
  numero: z.number().int().nullable().optional(),
  nom: z.string().nullable().optional(),
  macro: MacroExerciceEnum.nullable().optional(),
})

export async function POST(req: Request) {
  const { error } = await requireAdmin()
  if (error) return error

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return zodFieldError(parsed.error)

  try {
    const exercice = await prisma.exercice.create({
      data: { ...parsed.data },
    })
    return Response.json(exercice, { status: 201 })
  } catch (err) {
    return handlePrismaError(err, { P2002: "Ce numéro est déjà utilisé" })
  }
}

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const exercices = await prisma.exercice.findMany({
      select: { id: true, numero: true, nom: true, macro: true, version: true, updatedAt: true, publishedAt: true },
      orderBy: { numero: "asc" },
    })
    return Response.json(exercices)
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
