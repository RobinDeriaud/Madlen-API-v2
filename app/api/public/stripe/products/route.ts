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

    const userType = user.user_type.toLowerCase()

    const products = await stripe.products.list({
      active: true,
      expand: ["data.default_price"],
    })

    const mapProduct = (p: Stripe.Product) => {
      const price = p.default_price as Stripe.Price | null
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        priceId: price?.id ?? null,
        amount: price?.unit_amount ?? 0,
        currency: price?.currency ?? "eur",
        licenseDays: parseInt(p.metadata.license_days || "0"),
      }
    }

    const licenses = products.data
      .filter(
        (p) =>
          p.metadata.type === "license" && p.metadata.user_type === userType
      )
      .map(mapProduct)
      .filter((p) => p.priceId !== null)

    const kitProduct = products.data.find((p) => p.metadata.type === "kit")
    const kit = kitProduct ? mapProduct(kitProduct) : null

    return Response.json({ licenses, kit })
  } catch (err) {
    console.error("[GET /api/public/stripe/products]", err)
    return Response.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
