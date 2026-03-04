import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendConfirmationEmail } from "@/lib/mailer"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { z } from "zod"

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  nom: z.string().nullable().optional(),
  prenom: z.string().nullable().optional(),
  user_type: z.enum(["NONE", "PATIENT", "PRATICIEN"]).optional(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.errors[0]
    const msg = first ? `${first.path.join(".")}: ${first.message}` : "Invalid input"
    return Response.json({ error: msg }, { status: 400 })
  }

  const { password, ...rest } = parsed.data
  const passwordHash = await bcrypt.hash(password, 10)

  try {
    const user = await prisma.user.create({
      data: { passwordHash, ...rest },
    })

    if (rest.user_type === "PATIENT") {
      await prisma.patient.create({ data: { userId: user.id } })
    } else if (rest.user_type === "PRATICIEN") {
      await prisma.praticien.create({ data: { userId: user.id } })
    }

    const token = crypto.randomBytes(32).toString("hex")
    const expiry = new Date(Date.now() + 48 * 60 * 60 * 1000)
    await prisma.user.update({
      where: { id: user.id },
      data: { emailConfirmToken: token, emailConfirmExpiry: expiry },
    })

    const confirmUrl = `${process.env.APP_URL}/confirm-email?token=${token}`
    sendConfirmationEmail(user.email, confirmUrl).catch((err) =>
      console.error("[email] Confirmation send failed:", err)
    )

    return Response.json({ id: user.id }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/users]", err)
    if (err instanceof Error && "code" in err && err.code === "P2002") {
      return Response.json({ error: "Email déjà utilisé" }, { status: 409 })
    }
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")?.trim() ?? ""
  const typeParam = searchParams.get("type")

  try {
    const users = await prisma.user.findMany({
      where: {
        ...(typeParam ? { user_type: typeParam as "NONE" | "PATIENT" | "PRATICIEN" } : {}),
        ...(q
          ? {
              OR: [
                { nom: { contains: q, mode: "insensitive" } },
                { prenom: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        user_type: true,
        confirmed: true,
        profil_patient: { select: { id: true, praticienId: true } },
      },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
      ...(q ? { take: 20 } : {}),
    })
    return Response.json(users)
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
