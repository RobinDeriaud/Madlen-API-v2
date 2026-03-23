import { auth } from "@/lib/auth"
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
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id: rawId } = await params
  const id = parseInt(rawId)
  if (isNaN(id)) return Response.json({ error: "Invalid id" }, { status: 400 })

  try {
    const exercice = await prisma.exercice.findUnique({ where: { id } })
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
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id: rawId } = await params
  const id = parseInt(rawId)
  if (isNaN(id)) return Response.json({ error: "Invalid id" }, { status: 400 })

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
    if (err instanceof Error && "code" in err && err.code === "P2002") {
      return Response.json({ error: "Ce numéro est déjà utilisé" }, { status: 409 })
    }
    if (err instanceof Error && "code" in err && err.code === "P2025") {
      return Response.json({ error: "Not found" }, { status: 404 })
    }
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id: rawId } = await params
  const id = parseInt(rawId)
  if (isNaN(id)) return Response.json({ error: "Invalid id" }, { status: 400 })

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
    if (err instanceof Error && "code" in err && err.code === "P2025") {
      return Response.json({ error: "Not found" }, { status: 404 })
    }
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
