import { requireUser } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { BCRYPT_ROUNDS, zodFieldError } from "@/lib/validate"
import bcrypt from "bcryptjs"
import { z } from "zod"

const schema = z.object({
  currentPassword: z.string().min(1),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  passwordConfirmation: z.string().min(8),
}).refine((data) => data.password === data.passwordConfirmation, {
  message: "Les mots de passe ne correspondent pas",
  path: ["passwordConfirmation"],
})

export async function POST(req: Request) {
  const { userId, error } = await requireUser(req)
  if (error) return error

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return zodFieldError(parsed.error)

  const { currentPassword, password } = parsed.data

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return Response.json({ error: "Utilisateur introuvable" }, { status: 404 })
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!passwordMatch) {
      return Response.json({ error: "Mot de passe actuel incorrect" }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
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
