import { verifyUserJwt } from "@/lib/user-jwt"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import { z } from "zod"

const checkoutSchema = z.object({
  licensePriceId: z.string().optional(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
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
  const parsed = checkoutSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "Données invalides" }, { status: 400 })
  }

  const { successUrl, cancelUrl } = parsed.data
  const licensePriceId = parsed.data.licensePriceId ?? process.env.STRIPE_PRICE_ID
  const kitPriceId = process.env.STRIPE_KIT_PRICE_ID

  if (!licensePriceId) {
    return Response.json(
      { error: "Configuration de paiement manquante" },
      { status: 500 }
    )
  }

  try {
    const userId = parseInt(payload.sub)
    if (!userId || isNaN(userId)) {
      return Response.json({ error: "Token invalide" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return Response.json({ error: "Utilisateur introuvable" }, { status: 404 })
    }

    const lineItems: { price: string; quantity: number }[] = [
      { price: licensePriceId, quantity: 1 },
    ]

    if (kitPriceId) {
      lineItems.push({ price: kitPriceId, quantity: 1 })
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      customer_email: user.email,
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      metadata: { userId: String(userId) },
    })

    return Response.json({ checkoutUrl: session.url }, { status: 200 })
  } catch (err) {
    console.error("[POST /api/public/checkout]", err)
    return Response.json(
      { error: "Erreur lors de la création du paiement" },
      { status: 500 }
    )
  }
}
