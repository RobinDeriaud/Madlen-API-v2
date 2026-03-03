import { auth } from "@/lib/auth"
import sql from "@/lib/db"
import { createUserSchema } from "@/lib/validate"
import bcrypt from "bcryptjs"

export async function GET() {
  const session = await auth()
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const users = await sql`
      SELECT id, email, role, created_at
      FROM users
      ORDER BY created_at DESC
    `
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
  const password_hash = await bcrypt.hash(password, 12)

  try {
    const [user] = await sql`
      INSERT INTO users (email, password_hash, role)
      VALUES (${email}, ${password_hash}, ${role})
      RETURNING id, email, role, created_at
    `
    return Response.json(user, { status: 201 })
  } catch (err: unknown) {
    const pgError = err as { code?: string }
    if (pgError?.code === "23505") {
      return Response.json({ error: "Email already exists" }, { status: 409 })
    }
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
