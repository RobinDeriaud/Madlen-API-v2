import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { updateAdminUserSchema, zodFieldError } from "@/lib/validate"
import bcrypt from "bcryptjs"

const select = { id: true, email: true, role: true, notifications: true, createdAt: true }

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
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id: rawId } = await params
  const id = parseInt(rawId)
  if (isNaN(id)) return Response.json({ error: "Invalid id" }, { status: 400 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = updateAdminUserSchema.safeParse(body)
  if (!parsed.success) return zodFieldError(parsed.error)

  const { password, ...rest } = parsed.data
  const data: Record<string, unknown> = { ...rest }
  if (password) {
    data.passwordHash = await bcrypt.hash(password, 12)
  }

  try {
    const updated = await prisma.adminUser.update({ where: { id }, data, select })
    return Response.json(updated)
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === "P2002") {
      return Response.json({ error: "Cet email est déjà utilisé", fields: { email: "Cet email est déjà utilisé" } }, { status: 409 })
    }
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

  // Empêcher un admin de se supprimer lui-même
  if (String(id) === String(session.user?.id)) {
    return Response.json({ error: "Vous ne pouvez pas supprimer votre propre compte" }, { status: 400 })
  }

  try {
    await prisma.adminUser.delete({ where: { id } })
    return Response.json({ ok: true })
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === "P2025") {
      return Response.json({ error: "Not found" }, { status: 404 })
    }
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
