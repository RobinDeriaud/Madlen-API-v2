import { prisma } from "@/lib/prisma"
import { verifyUserJwt } from "@/lib/user-jwt"
import bcrypt from "bcryptjs"
import { z } from "zod"

const schema = z.object({
  currentPassword: z.string().min(1),
  password: z.string().min(6),
  passwordConfirmation: z.string().min(6),
}).refine((data) => data.password === data.passwordConfirmation, {
  message: "Les mots de passe ne correspondent pas",
  path: ["passwordConfirmation"],
})

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization")
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null

  if (!token) {
    return Response.json({ error: "Token manquant" }, { status: 401 })
  }

  const payload = await verifyUserJwt(token)
  if (!payload) {
    return Response.json({ error: "Token invalide ou expiré" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.errors[0]
    const msg = first ? first.message : "Données invalides"
    return Response.json({ error: msg }, { status: 400 })
  }

  const { currentPassword, password } = parsed.data

  try {
    const userId = parseInt(payload.sub)
    if (!userId || isNaN(userId)) {
      return Response.json({ error: "Token invalide" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return Response.json({ error: "Utilisateur introuvable" }, { status: 404 })
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!passwordMatch) {
      return Response.json({ error: "Mot de passe actuel incorrect" }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    })

    return Response.json({ ok: true })
  } catch (err) {
    console.error("[POST /api/public/change-password]", err)
    return Response.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
