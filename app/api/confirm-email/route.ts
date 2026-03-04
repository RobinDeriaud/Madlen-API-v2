import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")

  if (!token) {
    return Response.json({ error: "Token manquant" }, { status: 400 })
  }

  try {
    const user = await prisma.user.findFirst({
      where: { emailConfirmToken: token },
      select: { id: true, confirmed: true, emailConfirmExpiry: true },
    })

    if (!user) {
      return Response.json({ error: "Lien invalide ou déjà utilisé" }, { status: 404 })
    }

    if (user.confirmed) {
      return Response.json({ alreadyConfirmed: true })
    }

    if (user.emailConfirmExpiry && user.emailConfirmExpiry < new Date()) {
      return Response.json({ error: "Lien expiré (validité 48h)" }, { status: 410 })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { confirmed: true, emailConfirmToken: null, emailConfirmExpiry: null },
    })

    return Response.json({ success: true })
  } catch {
    return Response.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
