import { prisma } from "@/lib/prisma"
import { signUserJwt, normalizeUser } from "@/lib/user-jwt"
import bcrypt from "bcryptjs"
import { z } from "zod"

const loginSchema = z.object({
  identifier: z.string().email("Email invalide"),
  password: z.string().min(1),
})

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "Email ou mot de passe invalide" }, { status: 400 })
  }

  const { identifier, password } = parsed.data

  try {
    const user = await prisma.user.findUnique({
      where: { email: identifier },
      include: { profil_patient: true, profil_praticien: true },
    })

    // Toujours appeler bcrypt même si l'utilisateur n'existe pas (anti timing-attack)
    const DUMMY_HASH = "$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345"
    const passwordMatch = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH)
    if (!user || !passwordMatch) {
      return Response.json({ error: "Identifiants incorrects" }, { status: 400 })
    }

    if (!user.confirmed) {
      return Response.json(
        { error: "Veuillez confirmer votre email avant de vous connecter" },
        { status: 401 }
      )
    }

    const jwt = await signUserJwt({ sub: String(user.id), email: user.email })
    return Response.json({ jwt, user: normalizeUser(user) })
  } catch (err) {
    console.error("[POST /api/public/login]", err)
    return Response.json({ error: "Erreur lors de la connexion" }, { status: 500 })
  }
}
