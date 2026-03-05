import { prisma } from "@/lib/prisma"
import { sendConfirmationEmail } from "@/lib/mailer"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { z } from "zod"

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  nom: z.string().min(1),
  prenom: z.string().min(1),
  user_type: z.enum(["PATIENT", "PRATICIEN"]),
})

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.errors[0]
    const msg = first ? `${first.path.join(".")}: ${first.message}` : "Invalid input"
    return Response.json({ error: msg }, { status: 400 })
  }

  const { password, ...rest } = parsed.data
  const passwordHash = await bcrypt.hash(password, 10)
  const emailConfirmToken = crypto.randomBytes(32).toString("hex")
  const emailConfirmExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000)

  try {
    // Transaction atomique : user + profil + token de confirmation en une seule opération
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { passwordHash, emailConfirmToken, emailConfirmExpiry, ...rest },
      })

      if (rest.user_type === "PATIENT") {
        await tx.patient.create({ data: { userId: created.id } })
      } else {
        await tx.praticien.create({ data: { userId: created.id } })
      }

      return created
    })

    const confirmUrl = `${process.env.APP_URL}/api/auth/email-confirmation?token=${emailConfirmToken}`
    sendConfirmationEmail(user.email, confirmUrl).catch((err) =>
      console.error("[email] Confirmation send failed:", err)
    )

    return Response.json(
      {
        jwt: null,
        user: {
          id: user.id,
          email: user.email,
          nom: user.nom,
          prenom: user.prenom,
          user_type: user.user_type,
          confirmed: user.confirmed,
        },
        emailConfirmationRequired: true,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error("[POST /api/public/register]", err)
    if (err instanceof Error && "code" in err && err.code === "P2002") {
      return Response.json({ error: "Email déjà utilisé" }, { status: 409 })
    }
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
