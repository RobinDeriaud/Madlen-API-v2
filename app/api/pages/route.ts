import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { zodFieldError } from "@/lib/validate"
import { z } from "zod"

const createSchema = z.object({
  nom: z.string().min(1, "Le nom est requis"),
  slug: z.string().min(1, "Le slug est requis").regex(/^[a-z0-9-]+$/, "Slug invalide (a-z, 0-9, tirets)"),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return zodFieldError(parsed.error)

  try {
    const page = await prisma.pageStatique.create({
      data: { nom: parsed.data.nom, slug: parsed.data.slug },
    })
    return Response.json(page, { status: 201 })
  } catch (err) {
    console.error("[POST /api/pages]", err)
    if (err instanceof Error && "code" in err && err.code === "P2002") {
      return Response.json({ error: "Ce slug est déjà utilisé", fields: { slug: "Ce slug est déjà utilisé" } }, { status: 409 })
    }
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET() {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

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
