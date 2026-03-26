/**
 * Script one-shot : synchronise les licences depuis Stripe vers la DB.
 * Collecte toutes les sessions par user, puis ne garde que la meilleure :
 *  - Priorité aux licences actives (non remboursées, non expirées)
 *  - En cas d'égalité, la plus récente gagne
 *
 * Usage : node scripts/backfill-licences.mjs
 */

import { readFileSync } from "fs"
import { resolve } from "path"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import Stripe from "stripe"

// Load .env
const envPath = resolve(process.cwd(), ".env")
const envContent = readFileSync(envPath, "utf-8")
for (const line of envContent.split("\n")) {
  const [key, ...rest] = line.split("=")
  if (key && rest.length) process.env[key.trim()] = rest.join("=").trim()
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

async function main() {
  let hasMore = true
  let startingAfter = undefined
  let processed = 0

  // Collecter la meilleure licence par user : { userId → { licenceActive, productName, purchasedAt, expiresAt, reason } }
  const best = new Map()

  console.log("Backfill licences — collecte des sessions Stripe…")

  while (hasMore) {
    const params = {
      status: "complete",
      limit: 100,
      expand: ["data.payment_intent"],
    }
    if (startingAfter) params.starting_after = startingAfter

    const sessions = await stripe.checkout.sessions.list(params)

    for (const session of sessions.data) {
      processed++

      const userId = session.metadata?.userId
        ? parseInt(session.metadata.userId)
        : null
      if (!userId) continue

      // Vérifier que l'email Stripe correspond au user en DB
      const stripeEmail = session.customer_details?.email
      if (stripeEmail) {
        try {
          const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
          if (user && user.email !== stripeEmail) {
            console.log(`  User ${userId}: SKIP — email mismatch (Stripe=${stripeEmail}, DB=${user.email})`)
            continue
          }
        } catch { /* user not found, will be caught later */ }
      }

      // Vérifier remboursement
      const pi = session.payment_intent
      let isRefunded = false
      const piId = pi && typeof pi === "object" ? pi.id : typeof pi === "string" ? pi : null
      if (piId) {
        const charges = await stripe.charges.list({ payment_intent: piId, limit: 1 })
        if (charges.data[0]?.refunded) isRefunded = true
      }

      // Récupérer les line items
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
        expand: ["data.price.product"],
      })

      let productName = null
      let licenseDays = 365
      let hasLicense = false

      for (const item of lineItems.data) {
        const product = item.price?.product
        if (!product || typeof product === "string") continue
        if (product.metadata?.type === "license") {
          productName = product.name
          licenseDays = parseInt(product.metadata?.license_days || "365")
          hasLicense = true
        }
      }

      if (!hasLicense) continue

      const purchasedAt = new Date(session.created * 1000)
      const expiresAt = new Date((session.created + licenseDays * 86400) * 1000)
      const isExpired = expiresAt < new Date()
      const licenceActive = !isRefunded && !isExpired
      const reason = isRefunded ? "REFUNDED" : isExpired ? "EXPIRED" : "OK"

      const current = best.get(userId)

      // Garder cette session si :
      // 1. Pas encore de résultat pour ce user
      // 2. Celle-ci est active et la précédente ne l'était pas
      // 3. Les deux sont actives mais celle-ci est plus récente
      const isBetter =
        !current ||
        (licenceActive && !current.licenceActive) ||
        (licenceActive && current.licenceActive && purchasedAt > current.purchasedAt)

      if (isBetter) {
        best.set(userId, { licenceActive, productName, purchasedAt, expiresAt, reason })
      }
    }

    hasMore = sessions.has_more
    if (sessions.data.length > 0) {
      startingAfter = sessions.data[sessions.data.length - 1].id
    }
  }

  console.log(`${processed} sessions traitées, ${best.size} users à mettre à jour\n`)

  let updated = 0
  for (const [userId, data] of best) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          licenceActive: data.licenceActive,
          licenceProductName: data.productName,
          licencePurchasedAt: data.purchasedAt,
          licenceExpiresAt: data.expiresAt,
        },
      })
      updated++
      console.log(
        `  User ${userId}: ${data.licenceActive ? "ACTIVE" : "INACTIVE"} — ${data.productName} — ${data.reason}`
      )
    } catch (err) {
      if (err.code === "P2025") {
        console.log(`  User ${userId}: NOT FOUND (skipped)`)
      } else {
        throw err
      }
    }
  }

  console.log(`\nTerminé — ${updated} users mis à jour`)
  await prisma.$disconnect()
  await pool.end()
}

main().catch((err) => {
  console.error("ERREUR:", err)
  process.exit(1)
})
