import { requireAdmin, handlePrismaError } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { zodFieldError } from "@/lib/validate"
import { z } from "zod"

const createSchema = z.object({
  nom: z.string().min(1, "Le nom est requis"),
  slug: z.string().min(1, "Le slug est requis").regex(/^[a-z0-9-]+$/, "Slug invalide (a-z, 0-9, tirets)"),
})

export async function POST(req: Request) {
  const { error } = await requireAdmin()
  if (error) return error

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return zodFieldError(parsed.error)

  try {
    const page = await prisma.pageStatique.create({
      data: { nom: parsed.data.nom, slug: parsed.data.slug },
    })
    return Response.json(page, { status: 201 })
  } catch (err) {
    return handlePrismaError(err, { P2002: "Ce slug est déjà utilisé" })
  }
}

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const pages = await prisma.pageStatique.findMany({
      select: { id: true, nom: true, slug: true, publishedAt: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    })
    return Response.json(pages)
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
