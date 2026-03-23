import nodemailer from "nodemailer"
import fs from "fs"
import path from "path"

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USERNAME,
    pass: process.env.SMTP_PASSWORD,
  },
})

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c))
}

function renderTemplate(templateName: string, vars: Record<string, string>): string {
  const filePath = path.join(process.cwd(), "lib", "email-templates", templateName)
  let html = fs.readFileSync(filePath, "utf-8")
  for (const [key, value] of Object.entries(vars)) {
    html = html.replaceAll(`{{${key}}}`, escapeHtml(value))
  }
  return html
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const html = renderTemplate("password-reset.html", { RESET_URL: resetUrl })
  const text = `Réinitialisation de votre mot de passe MADLEN\n\nCliquez sur ce lien pour choisir un nouveau mot de passe :\n${resetUrl}\n\nCe lien est valable 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.\n\n© 2025 MADLEN - AMS-Logophonie`
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "Madlen <ne-pas-repondre@madlen.app>",
    to,
    subject: "Réinitialisation de votre mot de passe - MADLEN",
    html,
    text,
  })
}

export async function sendPraticienConfirmationEmail(
  to: string,
  confirmUrl: string,
  praticienNom: string
): Promise<void> {
  const html = renderTemplate("praticien-confirmation.html", {
    CONFIRM_URL: confirmUrl,
    PRATICIEN_NOM: praticienNom,
  })
  const text = `Votre praticien ${praticienNom} souhaite accéder à votre parcours MADLEN.\n\nConfirmez cette demande en cliquant sur ce lien :\n${confirmUrl}\n\nCe lien est valable 7 jours. Si vous ne reconnaissez pas ce praticien, ignorez cet e-mail.\n\n© 2025 MADLEN - AMS-Logophonie`
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "Madlen <ne-pas-repondre@madlen.app>",
    to,
    subject: `${praticienNom} souhaite vous suivre sur MADLEN`,
    html,
    text,
  })
}

export async function sendPraticienNotificationEmail(
  to: string,
  patientNom: string
): Promise<void> {
  const html = renderTemplate("praticien-notification.html", { PATIENT_NOM: patientNom })
  const text = `${patientNom} a accepté votre demande de suivi sur MADLEN.\n\nVous pouvez désormais accéder à son parcours d'entraînement vocal depuis votre espace praticien.\n\n© 2025 MADLEN - AMS-Logophonie`
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "Madlen <ne-pas-repondre@madlen.app>",
    to,
    subject: `${patientNom} a confirmé votre demande de suivi - MADLEN`,
    html,
    text,
  })
}

export async function sendEmailChangeEmail(to: string, confirmUrl: string, newEmail: string): Promise<void> {
  const html = renderTemplate("email-change.html", { CONFIRM_URL: confirmUrl, NEW_EMAIL: newEmail })
  const text = `Changement d'adresse e-mail MADLEN\n\nVous avez demandé à changer votre adresse e-mail pour ${newEmail}.\n\nConfirmez ce changement en cliquant sur ce lien :\n${confirmUrl}\n\nCe lien est valable 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.\n\n© 2025 MADLEN - AMS-Logophonie`
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "Madlen <ne-pas-repondre@madlen.app>",
    to,
    subject: "Confirmez votre nouvelle adresse e-mail - MADLEN",
    html,
    text,
  })
}

const MACRO_COLORS: Record<string, { label: string; bg: string; border: string; text: string }> = {
  AJUSTEMENT_100:         { label: "Ajustement",         bg: "#7A8C28", border: "#636F20", text: "#ffffff" },
  HYGIENE_PHONATOIRE_200: { label: "Hygiène phonatoire", bg: "#C0D060", border: "#A4B448", text: "#333333" },
  PRAXIES_300:            { label: "Praxies",            bg: "#DCE878", border: "#C4D060", text: "#444444" },
  RENDEMENT_VOCAL_400:    { label: "Rendement vocal",    bg: "#C87860", border: "#AA6048", text: "#ffffff" },
  FLEXIBILITE_VOCALE_500: { label: "Flexibilité vocale", bg: "#E8AA90", border: "#CC9070", text: "#333333" },
  INTELLIGIBILITE_600:    { label: "Intelligibilité",    bg: "#7890A0", border: "#607888", text: "#ffffff" },
  FLUENCE_700:            { label: "Fluence",            bg: "#A0B4C0", border: "#889CA8", text: "#333333" },
}

function formatDateFR(date: Date | null): string {
  if (!date) return "—"
  const d = String(date.getDate()).padStart(2, "0")
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const y = date.getFullYear()
  return `${d}/${m}/${y}`
}

export async function sendListeActivatedEmail(
  to: string,
  patientNom: string,
  listeNom: string,
  listeDate: Date | null,
  exercices: { macro: string | null; nom: string | null }[]
): Promise<void> {
  // Grouper les exercices par macro
  const grouped = new Map<string, string[]>()
  for (const ex of exercices) {
    const key = ex.macro ?? "_SANS_MACRO"
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(ex.nom ?? "Sans nom")
  }

  // Générer les sections HTML par macro
  const sections: string[] = []
  for (const [macroKey, noms] of grouped) {
    const config = MACRO_COLORS[macroKey]
    const label = config?.label ?? macroKey
    const bg = config?.bg ?? "#9CA3AF"
    const border = config?.border ?? "#6B7280"
    const textColor = config?.text ?? "#ffffff"

    const items = noms.map((n) =>
      `<div style="padding: 8px 16px; font-size: 13px; color: #425466; border-bottom: 1px solid #F0F0F0;">${escapeHtml(n)}</div>`
    ).join("\n")

    sections.push(
      `<div style="margin-bottom: 16px; border-radius: 8px; overflow: hidden; border: 1px solid ${border};">
        <div style="background-color: ${bg}; padding: 10px 16px;">
          <span style="font-size: 13px; font-weight: 600; color: ${textColor};">${escapeHtml(label)}</span>
        </div>
        <div style="background-color: #ffffff;">
          ${items}
        </div>
      </div>`
    )
  }

  const filePath = path.join(process.cwd(), "lib", "email-templates", "liste-activated.html")
  let html = fs.readFileSync(filePath, "utf-8")
  html = html.replaceAll("{{PATIENT_NOM}}", escapeHtml(patientNom))
  html = html.replaceAll("{{LISTE_NOM}}", escapeHtml(listeNom))
  html = html.replaceAll("{{LISTE_DATE}}", formatDateFR(listeDate))
  html = html.replaceAll("{{MACRO_SECTIONS}}", sections.join("\n"))

  // Version texte
  const textGroups: string[] = []
  for (const [macroKey, noms] of grouped) {
    const label = MACRO_COLORS[macroKey]?.label ?? macroKey
    textGroups.push(`[${label}]\n${noms.map((n) => `  - ${n}`).join("\n")}`)
  }
  const text = `Nouvelle liste d'exercices disponible\n\nBonjour ${patientNom},\n\nVotre praticien vous a attribué une nouvelle liste d'exercices sur MADLEN :\n\n${listeNom} — ${formatDateFR(listeDate)}\n\n${textGroups.join("\n\n")}\n\nConnectez-vous à l'application pour commencer vos exercices.\n\n© 2025 MADLEN - AMS-Logophonie`

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "Madlen <ne-pas-repondre@madlen.app>",
    to,
    subject: "Nouvelle liste d'exercices disponible - MADLEN",
    html,
    text,
  })
}

export async function sendInvitationEmail(
  to: string,
  registerUrl: string,
  praticienNom: string
): Promise<void> {
  const html = renderTemplate("invitation.html", {
    REGISTER_URL: registerUrl,
    PRATICIEN_NOM: praticienNom,
  })
  const text = `${praticienNom} vous invite à rejoindre MADLEN, une application d'entraînement vocal.\n\nPour commencer votre parcours, créez votre compte en cliquant sur ce lien :\n${registerUrl}\n\nSi vous ne connaissez pas ce praticien, ignorez cet e-mail.\n\n© 2025 MADLEN - AMS-Logophonie`
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "Madlen <ne-pas-repondre@madlen.app>",
    to,
    subject: `${praticienNom} vous invite sur MADLEN`,
    html,
    text,
  })
}

// ─── Patient Setup Email ────────────────────────────────────────────────────
// Envoyé quand un praticien (ou l'admin) crée un compte patient.
// Contient un lien vers /configurer-compte?token=xxx sur le site.
// Le patient y complète son profil (prénom, nom, âge, sexe, mot de passe).
// À la soumission, l'affiliation praticien est auto-confirmée.
// Réutilisable hors admin : appeler signPatientSetupJwt() + cette fonction.
export async function sendPatientSetupEmail(
  to: string,
  setupUrl: string,
  praticienNom: string
): Promise<void> {
  const html = renderTemplate("patient-setup.html", {
    SETUP_URL: setupUrl,
    PRATICIEN_NOM: praticienNom,
  })
  const text = `${praticienNom} vous a ajouté en tant que patient sur MADLEN, une application d'entraînement vocal.\n\nPour accéder à votre espace, finalisez la création de votre compte en cliquant sur ce lien :\n${setupUrl}\n\nCe lien est valable 7 jours. Si vous ne connaissez pas ce praticien, ignorez cet e-mail.\n\n© 2025 MADLEN - AMS-Logophonie`
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "Madlen <ne-pas-repondre@madlen.app>",
    to,
    subject: `${praticienNom} vous a ajouté sur MADLEN`,
    html,
    text,
  })
}

export async function sendConfirmationEmail(to: string, confirmUrl: string): Promise<void> {
  const html = renderTemplate("confirmation.html", { CONFIRM_URL: confirmUrl })
  const text = `Bienvenue chez MADLEN !\n\nConfirmez votre adresse e-mail en cliquant sur ce lien :\n${confirmUrl}\n\nCe lien est valable 48h. Si vous n'êtes pas à l'origine de cette inscription, ignorez ce message.\n\n© 2025 MADLEN - AMS-Logophonie`
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "Madlen <ne-pas-repondre@madlen.app>",
    to,
    subject: "Confirmez votre adresse e-mail - MADLEN",
    html,
    text,
  })
}
