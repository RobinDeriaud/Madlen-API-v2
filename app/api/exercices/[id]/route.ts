import { requireAdmin, parseId, handlePrismaError } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { zodFieldError } from "@/lib/validate"
import { z } from "zod"

const updateSchema = z.object({
  numero: z.number().int().nullable().optional(),
  nom: z.string().nullable().optional(),
  sigle: z.string().nullable().optional(),
  bref: z.string().nullable().optional(),
  but: z.string().nullable().optional(),
  instructions: z.string().nullable().optional(),
  astuce: z.string().nullable().optional(),
  commentaires: z.string().nullable().optional(),
  axe: z.string().nullable().optional(),
  macro: z.string().nullable().optional(),
  outil: z.string().nullable().optional(),
  outil_param: z.string().nullable().optional(),
  duree: z.number().int().optional(),
  recurrence: z.string().nullable().optional(),
  auteur: z.string().nullable().optional(),
  version: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
  boutons: z.any().optional(),
  fichier: z.string().nullable().optional(),
  publishedAt: z.string().nullable().optional(),
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
    const exercice = await prisma.exercice.findUnique({
      where: { id },
      include: { audioFiles: { orderBy: { name: "asc" } } },
    })
    if (!exercice) return Response.json({ error: "Not found" }, { status: 404 })
    return Response.json(exercice)
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

  const { date, publishedAt, ...rest } = parsed.data

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = { ...rest }
  if (date !== undefined) data.date = date ? new Date(date) : null
  if (publishedAt !== undefined) data.publishedAt = publishedAt ? new Date(publishedAt) : null

  try {
    const updated = await prisma.exercice.update({ where: { id }, data })
    return Response.json(updated)
  } catch (err) {
    return handlePrismaError(err, { P2002: "Ce numéro est déjà utilisé" })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id, error: idError } = parseId((await params).id)
  if (idError) return idError

  const body = await req.json()
  const parsed = z.object({ published: z.boolean() }).safeParse(body)
  if (!parsed.success) return zodFieldError(parsed.error)

  try {
    const updated = await prisma.exercice.update({
      where: { id },
      data: { publishedAt: parsed.data.published ? new Date() : null },
    })
    return Response.json(updated)
  } catch (err) {
    return handlePrismaError(err)
  }
}
