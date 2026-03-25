import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import type Stripe from "stripe"

/** GET — Liste des utilisateurs ayant acheté un kit (lecture Prisma, instantané) */
export async function GET() {
  const session = await auth()
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const users = await prisma.user.findMany({
      where: { kitPurchasedAt: { not: null } },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        kitInstalled: true,
        kitPurchasedAt: true,
      },
      orderBy: { kitPurchasedAt: "desc" },
    })

    return Response.json(users)
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

/** POST — Synchronisation depuis Stripe (rattrape les achats manquants) */
export async function POST() {
  const session = await auth()
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Parcourir toutes les sessions Stripe complétées
    let synced = 0
    let hasMore = true
    let startingAfter: string | undefined

    while (hasMore) {
      const batch = await stripe.checkout.sessions.list({
        status: "complete",
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      })

      for (const s of batch.data) {
        const userId = s.metadata?.userId ? parseInt(s.metadata.userId) : null
        if (!userId || isNaN(userId)) continue

        const lineItems = await stripe.checkout.sessions.listLineItems(s.id, {
          expand: ["data.price.product"],
        })

        const hasKit = lineItems.data.some((li) => {
          const prod = li.price?.product as Stripe.Product | undefined
          return prod?.metadata?.type === "kit"
        })

        if (hasKit) {
          const updated = await prisma.user.updateMany({
            where: { id: userId, kitPurchasedAt: null },
            data: { kitPurchasedAt: new Date(s.created * 1000) },
          })
          if (updated.count > 0) synced++
        }
      }

      hasMore = batch.has_more
      if (batch.data.length > 0) {
        startingAfter = batch.data[batch.data.length - 1].id
      }
    }

    return Response.json({ synced })
  } catch (err) {
    console.error("[POST /api/kit-installations] Sync error:", err)
    return Response.json({ error: "Erreur lors de la synchronisation" }, { status: 500 })
  }
}
