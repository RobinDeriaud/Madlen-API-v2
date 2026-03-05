import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  token: z.string().min(1),
})

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "Token manquant" }, { status: 400 })
  }

  const { token } = parsed.data

  try {
    const user = await prisma.user.findFirst({
      where: { emailChangeToken: token },
      select: {
        id: true,
        emailChangeExpiry: true,
        emailChangeNewEmail: true,
      },
    })

    if (!user) {
      return Response.json({ error: "Lien invalide ou déjà utilisé" }, { status: 404 })
    }

    if (user.emailChangeExpiry && user.emailChangeExpiry < new Date()) {
      // Nettoyer les champs expirés
      await prisma.user.update({
        where: { id: user.id },
        data: { emailChangeToken: null, emailChangeExpiry: null, emailChangeNewEmail: null },
      })
      return Response.json({ error: "Lien expiré (validité 1h)" }, { status: 410 })
    }

    if (!user.emailChangeNewEmail) {
      return Response.json({ error: "Demande invalide" }, { status: 400 })
    }

    // Vérifier que le nouvel email n'a pas été pris entre-temps
    const existing = await prisma.user.findUnique({ where: { email: user.emailChangeNewEmail } })
    if (existing) {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailChangeToken: null, emailChangeExpiry: null, emailChangeNewEmail: null },
      })
      return Response.json({ error: "Cet email est désormais utilisé par un autre compte" }, { status: 409 })
    }

    // Appliquer le changement d'email
    await prisma.user.update({
      where: { id: user.id },
      data: {
        email: user.emailChangeNewEmail,
        emailChangeToken: null,
        emailChangeExpiry: null,
        emailChangeNewEmail: null,
      },
    })

    return Response.json({ ok: true })
  } catch (err) {
    console.error("[POST /api/public/confirm-email-change]", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
