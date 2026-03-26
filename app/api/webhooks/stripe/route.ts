import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import { sendPaymentConfirmationEmail, sendAdminNewPurchaseEmail } from "@/lib/mailer"
import type Stripe from "stripe"

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get("stripe-signature")

  if (!signature) {
    return Response.json({ error: "Missing stripe-signature" }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured")
    return Response.json({ error: "Webhook not configured" }, { status: 500 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed:", err)
    return Response.json({ error: "Invalid signature" }, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object

    try {
      const userId = session.metadata?.userId
        ? parseInt(session.metadata.userId)
        : null
      if (!userId) {
        console.warn("[Stripe Webhook] No userId in metadata")
        return Response.json({ received: true }, { status: 200 })
      }

      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user) {
        console.warn("[Stripe Webhook] User not found:", userId)
        return Response.json({ received: true }, { status: 200 })
      }

      // Vérifier que l'email Stripe correspond au user en DB
      const stripeEmail = session.customer_details?.email
      if (stripeEmail && stripeEmail !== user.email) {
        console.warn(`[Stripe Webhook] Email mismatch: Stripe=${stripeEmail}, DB=${user.email} (userId=${userId})`)
        return Response.json({ received: true }, { status: 200 })
      }

      // Récupérer les line items pour identifier licence et kit
      const lineItems = await stripe.checkout.sessions.listLineItems(
        session.id,
        { expand: ["data.price.product"] }
      )

      let productName = "MADLEN"
      let hasKit = false
      let licenseDays = 365
      let hasLicense = false

      for (const item of lineItems.data) {
        const product = item.price?.product as Stripe.Product | undefined
        if (!product) continue
        if (product.metadata?.type === "license") {
          productName = product.name
          licenseDays = parseInt(product.metadata?.license_days || "365")
          hasLicense = true
        }
        if (product.metadata?.type === "kit") {
          hasKit = true
        }
      }

      // Marquer l'achat du kit en DB (try-catch P2025 si user supprimé entre-temps)
      if (hasKit && !user.kitPurchasedAt) {
        try {
          await prisma.user.update({
            where: { id: userId },
            data: { kitPurchasedAt: new Date(session.created * 1000) },
          })
        } catch (updateErr) {
          if (updateErr instanceof Error && "code" in updateErr && updateErr.code === "P2025") {
            console.warn(`[Stripe Webhook] User ${userId} was deleted before kit update`)
            return Response.json({ received: true }, { status: 200 })
          }
          throw updateErr
        }
      }

      // Activer la licence en DB
      if (hasLicense) {
        try {
          await prisma.user.update({
            where: { id: userId },
            data: {
              licenceActive: true,
              licenceProductName: productName,
              licencePurchasedAt: new Date(session.created * 1000),
              licenceExpiresAt: new Date((session.created + licenseDays * 86400) * 1000),
            },
          })
        } catch (updateErr) {
          if (updateErr instanceof Error && "code" in updateErr && updateErr.code === "P2025") {
            console.warn(`[Stripe Webhook] User ${userId} deleted before licence update`)
            return Response.json({ received: true }, { status: 200 })
          }
          throw updateErr
        }
      }

      const prenom = user.prenom ?? user.email
      const clientNom = [user.prenom, user.nom].filter(Boolean).join(" ") || user.email
      const amountStr =
        new Intl.NumberFormat("fr-FR", {
          style: "currency",
          currency: session.currency ?? "eur",
        }).format((session.amount_total ?? 0) / 100)

      // Email au client (non-bloquant)
      sendPaymentConfirmationEmail(user.email, prenom, productName, hasKit).catch(
        (err) => console.error("[Stripe Webhook] Email client failed:", err)
      )

      // Email aux admins avec notifications activées
      const admins = await prisma.adminUser.findMany({
        where: { notifications: true },
      })
      const adminUrl = process.env.NEXTAUTH_URL ?? "https://api.madlen.app"

      for (const admin of admins) {
        sendAdminNewPurchaseEmail(
          admin.email,
          user.email,
          clientNom,
          productName,
          amountStr,
          hasKit,
          adminUrl
        ).catch((err) =>
          console.error("[Stripe Webhook] Email admin failed:", admin.email, err)
        )
      }

      console.log(
        `[Stripe Webhook] Payment confirmed for ${user.email} — ${productName}${hasKit ? " + Kit" : ""}`
      )
    } catch (err) {
      console.error("[Stripe Webhook] Error processing event:", err)
      return Response.json({ error: "Internal error" }, { status: 500 })
    }
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge
    try {
      // Récupérer la session checkout liée à ce paiement
      const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id
      if (piId) {
        const sessions = await stripe.checkout.sessions.list({
          payment_intent: piId,
          limit: 1,
        })
        const session = sessions.data[0]
        const userId = session?.metadata?.userId ? parseInt(session.metadata.userId) : null

        if (userId && charge.refunded) {
          // Réinitialiser licence et kit si remboursement total
          await prisma.user.update({
            where: { id: userId },
            data: { licenceActive: false, kitPurchasedAt: null },
          })
          console.log(`[Stripe Webhook] Refund processed for user ${userId} — kitPurchasedAt reset`)
        }
      }
    } catch (err) {
      console.error("[Stripe Webhook] Error processing refund:", err)
    }
  }

  return Response.json({ received: true }, { status: 200 })
}
