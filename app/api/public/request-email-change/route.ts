import { prisma } from "@/lib/prisma"
import { verifyUserJwt } from "@/lib/user-jwt"
import { sendEmailChangeEmail } from "@/lib/mailer"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { z } from "zod"

const schema = z.object({
  newEmail: z.string().email().trim().toLowerCase(),
  password: z.string().min(1),
})

export async function POST(req: Request) {
  const auth = req.headers.get("authorization")
  if (!auth?.startsWith("Bearer ")) {
    return Response.json({ error: "Token manquant" }, { status: 401 })
  }

  const payload = await verifyUserJwt(auth.slice(7))
  if (!payload) {
    return Response.json({ error: "Token invalide ou expiré" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "Données invalides" }, { status: 400 })
  }

  const { newEmail, password } = parsed.data

  try {
    const user = await prisma.user.findUnique({ where: { id: Number(payload.sub) } })
    if (!user) {
      return Response.json({ error: "Utilisateur introuvable" }, { status: 404 })
    }

    // Vérifier le mot de passe actuel
    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return Response.json({ error: "Mot de passe incorrect" }, { status: 400 })
    }

    // Vérifier que le nouvel email n'est pas déjà utilisé
    if (newEmail.toLowerCase() === user.email.toLowerCase()) {
      return Response.json({ error: "Le nouvel email est identique à l'actuel" }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email: newEmail.toLowerCase() } })
    if (existing) {
      return Response.json({ error: "Cet email est déjà utilisé" }, { status: 409 })
    }

    // Générer le token et stocker la demande
    const token = crypto.randomBytes(32).toString("hex")
    const expiry = new Date(Date.now() + 60 * 60 * 1000) // 1 heure

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailChangeToken: token,
        emailChangeExpiry: expiry,
        emailChangeNewEmail: newEmail.toLowerCase(),
      },
    })

    // Envoyer l'email de confirmation à la NOUVELLE adresse
    const confirmUrl = `${process.env.APP_URL}/api/auth/confirm-email-change?token=${token}`
    sendEmailChangeEmail(newEmail, confirmUrl, newEmail).catch((err) =>
      console.error("[email] Email change send failed:", err)
    )

    return Response.json({ ok: true })
  } catch (err) {
    console.error("[POST /api/public/request-email-change]", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
