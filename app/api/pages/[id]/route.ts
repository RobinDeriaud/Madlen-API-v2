import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { zodFieldError } from "@/lib/validate"
import { z } from "zod"

const updateSchema = z.object({
  nom: z.string().nullable().optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/, "Slug invalide (a-z, 0-9, tirets)").nullable().optional(),
  contenu: z.string().nullable().optional(),
  date_modified: z.string().nullable().optional(),
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
    const page = await prisma.pageStatique.findUnique({ where: { id } })
    if (!page) return Response.json({ error: "Not found" }, { status: 404 })
    return Response.json(page)
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

  const { date_modified, ...rest } = parsed.data

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = { ...rest }
  if (date_modified !== undefined) data.date_modified = date_modified ? new Date(date_modified) : null

  try {
    const updated = await prisma.pageStatique.update({ where: { id }, data })
    return Response.json(updated)
  } catch (err) {
    console.error("[PUT /api/pages/[id]]", err)
    if (err instanceof Error && "code" in err && err.code === "P2002") {
      return Response.json({ error: "Ce slug est déjà utilisé", fields: { slug: "Ce slug est déjà utilisé" } }, { status: 409 })
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
    const updated = await prisma.pageStatique.update({
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

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id: rawId } = await params
  const id = parseInt(rawId)
  if (isNaN(id)) return Response.json({ error: "Invalid id" }, { status: 400 })

  try {
    await prisma.pageStatique.delete({ where: { id } })
    return Response.json({ ok: true })
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === "P2025") {
      return Response.json({ error: "Not found" }, { status: 404 })
    }
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
