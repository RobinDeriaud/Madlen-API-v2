import { auth } from "@/lib/auth"
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
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id: rawId } = await params
  const id = parseInt(rawId)
  if (isNaN(id)) return Response.json({ error: "Invalid id" }, { status: 400 })

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
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id: rawId } = await params
  const id = parseInt(rawId)
  if (isNaN(id)) return Response.json({ error: "Invalid id" }, { status: 400 })

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
