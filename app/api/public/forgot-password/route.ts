import { prisma } from "@/lib/prisma"
import { sendPasswordResetEmail } from "@/lib/mailer"
import crypto from "crypto"
import { z } from "zod"

const schema = z.object({
  email: z.string().email(),
})

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "Email invalide" }, { status: 400 })
  }

  const { email } = parsed.data

  try {
    const user = await prisma.user.findUnique({ where: { email } })

    // Toujours répondre 200 même si l'email est inconnu (anti énumération d'emails)
    if (!user) {
      return Response.json({ ok: true })
    }

    const token = crypto.randomBytes(32).toString("hex")
    const expiry = new Date(Date.now() + 60 * 60 * 1000) // 1 heure

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpiry: expiry },
    })

    const resetUrl = `${process.env.APP_URL}/reinitialiser-mot-de-passe?code=${token}`
    sendPasswordResetEmail(user.email, resetUrl).catch((err) =>
      console.error("[email] Password reset send failed:", err)
    )

    return Response.json({ ok: true })
  } catch (err) {
    console.error("[POST /api/public/forgot-password]", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
