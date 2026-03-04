import { prisma } from "@/lib/prisma"

interface Props {
  searchParams: Promise<{ token?: string }>
}

export default async function ConfirmEmailPage({ searchParams }: Props) {
  const { token } = await searchParams

  let status: "success" | "invalid" | "expired" | "missing" = "missing"

  if (token) {
    const user = await prisma.user.findFirst({
      where: { emailConfirmToken: token },
      select: { id: true, confirmed: true, emailConfirmExpiry: true },
    })

    if (!user) {
      status = "invalid"
    } else if (user.confirmed) {
      status = "success"
    } else if (user.emailConfirmExpiry && user.emailConfirmExpiry < new Date()) {
      status = "expired"
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { confirmed: true, emailConfirmToken: null, emailConfirmExpiry: null },
      })
      status = "success"
    }
  }

  const messages = {
    success: {
      title: "Compte confirmé !",
      body: "Votre adresse e-mail a bien été vérifiée. Vous pouvez maintenant vous connecter à l'application MADLEN.",
      color: "#00D4AA",
    },
    invalid: {
      title: "Lien invalide",
      body: "Ce lien de confirmation est invalide. Vérifiez que vous avez bien copié l'URL complète depuis votre e-mail.",
      color: "#E53E3E",
    },
    expired: {
      title: "Lien expiré",
      body: "Ce lien de confirmation a expiré (validité 48h). Veuillez contacter votre praticien ou l'administrateur pour obtenir un nouveau lien.",
      color: "#DD6B20",
    },
    missing: {
      title: "Lien manquant",
      body: "Aucun token de confirmation trouvé. Vérifiez que vous avez cliqué sur le lien complet dans votre e-mail.",
      color: "#E53E3E",
    },
  }

  const msg = messages[status]

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", backgroundColor: "#0A2540", minHeight: "100vh", margin: 0, padding: 0 }}>
      <div style={{ maxWidth: 500, margin: "0 auto" }}>
        <div style={{ padding: "50px 20px 15px", textAlign: "left" }}>
          <h1 style={{ color: "#ffffff", fontSize: 30, fontWeight: 600, letterSpacing: -0.5, margin: 0 }}>MADLEN</h1>
        </div>

        <div style={{ backgroundColor: "#ffffff", borderRadius: 12, margin: "0 10px 20px", padding: 40, boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <span style={{ fontSize: 48 }}>
              {status === "success" ? "✓" : "✗"}
            </span>
          </div>

          <h2 style={{ color: msg.color, fontSize: 20, fontWeight: 600, margin: "0 0 16px 0", textAlign: "center" }}>
            {msg.title}
          </h2>

          <p style={{ color: "#425466", fontSize: 14, lineHeight: 1.5, margin: 0, textAlign: "center" }}>
            {msg.body}
          </p>
        </div>

        <div style={{ padding: "0 40px 60px", textAlign: "center" }}>
          <p style={{ color: "#6B7C93", fontSize: 11, margin: 0 }}>
            © 2025 MADLEN - AMS-Logophonie - Tous droits réservés
          </p>
        </div>
      </div>
    </div>
  )
}
