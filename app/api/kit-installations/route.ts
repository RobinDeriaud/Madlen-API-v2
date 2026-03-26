import { requireAdmin } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import type Stripe from "stripe"

/** GET — Liste des utilisateurs ayant acheté un kit (lecture Prisma, instantané) */
export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

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

type LicenceState = {
  active: boolean
  productName: string | null
  purchasedAt: Date | null
  expiresAt: Date | null
}

type KitState = {
  purchasedAt: Date | null
}

/**
 * POST — Synchronisation unifiée licence + kit depuis Stripe.
 * Parcourt toutes les sessions complétées, vérifie les remboursements,
 * et met à jour les champs licence et kit de chaque user.
 */
export async function POST() {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    // Meilleur état par user
    const bestLicence = new Map<number, LicenceState>()
    const bestKit = new Map<number, KitState>()

    let hasMore = true
    let startingAfter: string | undefined

    while (hasMore) {
      const batch = await stripe.checkout.sessions.list({
        status: "complete",
        limit: 100,
        expand: ["data.payment_intent"],
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      })

      for (const session of batch.data) {
        const userId = session.metadata?.userId ? parseInt(session.metadata.userId) : null
        if (!userId || isNaN(userId)) continue

        // Vérifier remboursement via payment_intent → charges
        let isRefunded = false
        const pi = session.payment_intent
        const piId = pi && typeof pi === "object" ? pi.id : typeof pi === "string" ? pi : null
        if (piId) {
          const charges = await stripe.charges.list({ payment_intent: piId, limit: 1 })
          if (charges.data[0]?.refunded) isRefunded = true
        }

        // Lire les line items
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
          expand: ["data.price.product"],
        })

        for (const item of lineItems.data) {
          const product = item.price?.product as Stripe.Product | undefined
          if (!product) continue

          // ── Licence ──
          if (product.metadata?.type === "license") {
            const licenseDays = parseInt(product.metadata?.license_days || "365")
            const purchasedAt = new Date(session.created * 1000)
            const expiresAt = new Date((session.created + licenseDays * 86400) * 1000)
            const isExpired = expiresAt < new Date()
            const active = !isRefunded && !isExpired

            const current = bestLicence.get(userId)
            const isBetter =
              !current ||
              (active && !current.active) ||
              (active && current.active && purchasedAt > (current.purchasedAt ?? new Date(0)))

            if (isBetter) {
              bestLicence.set(userId, {
                active,
                productName: product.name,
                purchasedAt,
                expiresAt,
              })
            }
          }

          // ── Kit ──
          if (product.metadata?.type === "kit") {
            const purchasedAt = new Date(session.created * 1000)
            const current = bestKit.get(userId)

            if (isRefunded) {
              // Kit remboursé : ne remplace un état existant que si on n'a rien de mieux
              if (!current) {
                bestKit.set(userId, { purchasedAt: null })
              }
            } else {
              // Kit non remboursé : toujours meilleur qu'un remboursé, sinon garder le plus récent
              const isBetter =
                !current ||
                current.purchasedAt === null ||
                purchasedAt > current.purchasedAt

              if (isBetter) {
                bestKit.set(userId, { purchasedAt })
              }
            }
          }
        }
      }

      hasMore = batch.has_more
      if (batch.data.length > 0) {
        startingAfter = batch.data[batch.data.length - 1].id
      }
    }

    // Collecter tous les userIds à mettre à jour
    const allUserIds = new Set([...bestLicence.keys(), ...bestKit.keys()])
    let syncedLicences = 0
    let syncedKits = 0

    for (const userId of allUserIds) {
      const licence = bestLicence.get(userId)
      const kit = bestKit.get(userId)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: Record<string, any> = {}

      if (licence) {
        data.licenceActive = licence.active
        data.licenceProductName = licence.productName
        data.licencePurchasedAt = licence.purchasedAt
        data.licenceExpiresAt = licence.expiresAt
        syncedLicences++
      }

      if (kit) {
        data.kitPurchasedAt = kit.purchasedAt
        // Reset kitInstalled si le kit a été remboursé
        if (kit.purchasedAt === null) {
          data.kitInstalled = false
        }
        syncedKits++
      }

      try {
        await prisma.user.update({ where: { id: userId }, data })
      } catch (err) {
        if (err instanceof Error && "code" in err && err.code === "P2025") {
          // User supprimé entre-temps, on ignore
          continue
        }
        throw err
      }
    }

    return Response.json({
      synced: allUserIds.size,
      details: { licences: syncedLicences, kits: syncedKits },
    })
  } catch (err) {
    console.error("[POST /api/kit-installations] Sync error:", err)
    return Response.json({ error: "Erreur lors de la synchronisation" }, { status: 500 })
  }
}
