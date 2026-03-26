import { requireAdmin, parseId, handlePrismaError } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { zodFieldError } from "@/lib/validate"
import { z } from "zod"

const updateSchema = z.object({
  nom: z.string().nullable().optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/, "Slug invalide (a-z, 0-9, tirets)").nullable().optional(),
  contenu: z.string().nullable().optional(),
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
  const { error } = await requireAdmin()
  if (error) return error

  const { id, error: idError } = parseId((await params).id)
  if (idError) return idError

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return zodFieldError(parsed.error)

  const data = { ...parsed.data, date_modified: new Date() }

  try {
    const updated = await prisma.pageStatique.update({ where: { id }, data })
    return Response.json(updated)
  } catch (err) {
    return handlePrismaError(err, { P2002: "Ce slug est déjà utilisé" })
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
    const updated = await prisma.pageStatique.update({
      where: { id },
      data: { publishedAt: parsed.data.published ? new Date() : null },
    })
    return Response.json(updated)
  } catch (err) {
    return handlePrismaError(err)
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id, error: idError } = parseId((await params).id)
  if (idError) return idError

  try {
    await prisma.pageStatique.delete({ where: { id } })
    return Response.json({ ok: true })
  } catch (err) {
    return handlePrismaError(err)
  }
}
