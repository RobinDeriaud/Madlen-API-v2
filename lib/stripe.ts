import Stripe from "stripe"

function createStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set")
  return new Stripe(key)
}

// Singleton — évite de créer un nouveau client à chaque hot-reload en dev
const globalForStripe = globalThis as unknown as {
  stripe: Stripe | undefined
}

export const stripe =
  globalForStripe.stripe ?? createStripeClient()

if (process.env.NODE_ENV !== "production") {
  globalForStripe.stripe = stripe
}
