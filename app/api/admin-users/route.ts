import { requireAdmin, parseBody, handlePrismaError } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { BCRYPT_ROUNDS, createAdminUserSchema, zodFieldError } from "@/lib/validate"
import bcrypt from "bcryptjs"

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const users = await prisma.adminUser.findMany({
      select: { id: true, email: true, role: true, notifications: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    })
    return Response.json(users)
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const { body, error: bodyError } = await parseBody(req)
  if (bodyError) return bodyError

  const parsed = createAdminUserSchema.safeParse(body)
  if (!parsed.success) return zodFieldError(parsed.error)

  const { email, password, role, notifications } = parsed.data
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)

  try {
    const user = await prisma.adminUser.create({
      data: { email, passwordHash, role, notifications },
      select: { id: true, email: true, role: true, notifications: true, createdAt: true },
    })
    return Response.json(user, { status: 201 })
  } catch (err) {
    return handlePrismaError(err, { P2002: "Cet email est déjà utilisé" })
  }
}
