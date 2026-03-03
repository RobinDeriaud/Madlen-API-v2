import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createUserSchema } from "@/lib/validate"
import bcrypt from "bcryptjs"

export async function GET() {
  const session = await auth()
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const users = await prisma.adminUser.findMany({
      select: { id: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    })
    return Response.json(users)
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = createUserSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 })
  }

  const { email, password, role } = parsed.data
  const passwordHash = await bcrypt.hash(password, 12)

  try {
    const user = await prisma.adminUser.create({
      data: { email, passwordHash, role },
      select: { id: true, email: true, role: true, createdAt: true },
    })
    return Response.json(user, { status: 201 })
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === "P2002") {
      return Response.json({ error: "Email already exists" }, { status: 409 })
    }
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
