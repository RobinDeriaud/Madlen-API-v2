import { verifyUserJwt } from "@/lib/user-jwt"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import type Stripe from "stripe"

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null

  if (!token) {
    return Response.json({ error: "Token manquant" }, { status: 401 })
  }

  const payload = await verifyUserJwt(token)
  if (!payload) {
    return Response.json({ error: "Token invalide ou expiré" }, { status: 401 })
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

    const sessions = await stripe.checkout.sessions.list({
      status: "complete",
      limit: 100,
    })

    const now = Math.floor(Date.now() / 1000)

    for (const session of sessions.data) {
      // Vérifier que c'est bien cet utilisateur (via metadata)
      if (session.metadata?.userId !== String(userId)) continue
      // Double-vérification par email
      if (session.customer_details?.email !== user.email) continue

      const lineItems = await stripe.checkout.sessions.listLineItems(
        session.id,
        { expand: ["data.price.product"] }
      )

      // Trouver le line item de type "license" (ignorer le kit)
      const licenseItem = lineItems.data.find((li) => {
        const prod = li.price?.product as Stripe.Product | undefined
        return prod?.metadata?.type === "license"
      })
      if (!licenseItem) continue

      const product = licenseItem.price?.product as Stripe.Product | undefined
      if (!product) continue

      const licenseDays = parseInt(product.metadata?.license_days || "365")
      const purchasedAt = session.created
      const expiresAt = purchasedAt + licenseDays * 86400

      if (expiresAt > now) {
        return Response.json({
          hasLicense: true,
          license: {
            productId: product.id,
            productName: product.name,
            purchasedAt: new Date(purchasedAt * 1000).toISOString(),
            expiresAt: new Date(expiresAt * 1000).toISOString(),
            daysRemaining: Math.ceil((expiresAt - now) / 86400),
          },
        })
      }
    }

    return Response.json({ hasLicense: false, license: null })
  } catch (err) {
    console.error("[GET /api/public/stripe/license]", err)
    return Response.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
