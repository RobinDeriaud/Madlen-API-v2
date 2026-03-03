import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createSchema = z.object({
  numero: z.number().int().nullable().optional(),
  nom: z.string().nullable().optional(),
  macro: z.string().nullable().optional(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: "Invalid input" }, { status: 400 })

  try {
    const exercice = await prisma.exercice.create({
      data: { documentId: crypto.randomUUID(), ...parsed.data },
    })
    return Response.json(exercice, { status: 201 })
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === "P2002") {
      return Response.json({ error: "Ce numéro est déjà utilisé" }, { status: 409 })
    }
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET() {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const exercices = await prisma.exercice.findMany({
      select: { id: true, numero: true, nom: true, macro: true },
      orderBy: { numero: "asc" },
    })
    return Response.json(exercices)
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
