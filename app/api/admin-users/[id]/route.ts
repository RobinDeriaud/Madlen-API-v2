import { requireAdmin, parseId, parseBody, handlePrismaError } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { BCRYPT_ROUNDS, updateAdminUserSchema, zodFieldError } from "@/lib/validate"
import bcrypt from "bcryptjs"

const select = { id: true, email: true, role: true, notifications: true, createdAt: true }

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id, error: idError } = parseId((await params).id)
  if (idError) return idError

  try {
    const admin = await prisma.adminUser.findUnique({ where: { id }, select })
    if (!admin) return Response.json({ error: "Not found" }, { status: 404 })
    return Response.json(admin)
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

  const { body, error: bodyError } = await parseBody(req)
  if (bodyError) return bodyError

  const parsed = updateAdminUserSchema.safeParse(body)
  if (!parsed.success) return zodFieldError(parsed.error)

  const { password, ...rest } = parsed.data
  const data: Record<string, unknown> = { ...rest }
  if (password) {
    data.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  }

  try {
    const updated = await prisma.adminUser.update({ where: { id }, data, select })
    return Response.json(updated)
  } catch (err) {
    return handlePrismaError(err, { P2002: "Cet email est déjà utilisé" })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin()
  if (error) return error

  const { id, error: idError } = parseId((await params).id)
  if (idError) return idError

  if (String(id) === String(session.user?.id)) {
    return Response.json({ error: "Vous ne pouvez pas supprimer votre propre compte" }, { status: 400 })
  }

  try {
    await prisma.adminUser.delete({ where: { id } })
    return Response.json({ ok: true })
  } catch (err) {
    return handlePrismaError(err)
  }
}
