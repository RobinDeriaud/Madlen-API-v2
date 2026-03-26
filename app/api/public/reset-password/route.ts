import { prisma } from "@/lib/prisma"
import { BCRYPT_ROUNDS } from "@/lib/validate"
import bcrypt from "bcryptjs"
import { z } from "zod"

const schema = z.object({
  code: z.string().min(1),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  passwordConfirmation: z.string().min(8),
}).refine((data) => data.password === data.passwordConfirmation, {
  message: "Les mots de passe ne correspondent pas",
  path: ["passwordConfirmation"],
})

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.errors[0]
    const msg = first ? first.message : "Données invalides"
    return Response.json({ error: msg }, { status: 400 })
  }

  const { code, password } = parsed.data

  try {
    const user = await prisma.user.findFirst({
      where: { passwordResetToken: code },
    })

    if (!user) {
      return Response.json({ error: "Lien de réinitialisation invalide" }, { status: 404 })
    }

    if (!user.passwordResetExpiry || user.passwordResetExpiry < new Date()) {
      return Response.json({ error: "Ce lien a expiré, veuillez en demander un nouveau" }, { status: 410 })
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    })

    return Response.json({ ok: true })
  } catch (err) {
    console.error("[POST /api/public/reset-password]", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
