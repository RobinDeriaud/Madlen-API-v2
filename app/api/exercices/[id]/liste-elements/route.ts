import { requireAdmin, parseId } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { zodFieldError } from "@/lib/validate"
import { z } from "zod"

const elementSchema = z.object({
  element: z.string().nullable().optional(),
  reponse: z.enum(["NULL", "OUI", "NON"]).optional(),
  order: z.number().int().optional(),
})

const batchSchema = z.array(elementSchema)

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id, error: idError } = parseId((await params).id)
  if (idError) return idError

  try {
    const elements = await prisma.listeElement.findMany({
      where: { exerciceId: id },
      orderBy: { order: "asc" },
    })
    return Response.json(elements)
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
  const parsed = batchSchema.safeParse(body)
  if (!parsed.success) return zodFieldError(parsed.error)

  try {
    await prisma.$transaction(async (tx) => {
      await tx.listeElement.deleteMany({ where: { exerciceId: id } })
      if (parsed.data.length > 0) {
        await tx.listeElement.createMany({
          data: parsed.data.map((item, i) => ({
            exerciceId: id,
            element: item.element ?? null,
            reponse: item.reponse ?? "NULL",
            order: item.order ?? i,
          })),
        })
      }
    })

    const elements = await prisma.listeElement.findMany({
      where: { exerciceId: id },
      orderBy: { order: "asc" },
    })
    return Response.json(elements)
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
