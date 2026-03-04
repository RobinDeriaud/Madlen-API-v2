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

function renderTemplate(templateName: string, vars: Record<string, string>): string {
  const filePath = path.join(process.cwd(), "lib", "email-templates", templateName)
  let html = fs.readFileSync(filePath, "utf-8")
  for (const [key, value] of Object.entries(vars)) {
    html = html.replaceAll(`{{${key}}}`, value)
  }
  return html
}

export async function sendConfirmationEmail(to: string, confirmUrl: string): Promise<void> {
  const html = renderTemplate("confirmation.html", { CONFIRM_URL: confirmUrl })
  const text = `Bienvenue chez MADLEN !\n\nConfirmez votre adresse e-mail en cliquant sur ce lien :\n${confirmUrl}\n\nCe lien est valable 48h. Si vous n'êtes pas à l'origine de cette inscription, ignorez ce message.\n\n© 2025 MADLEN - AMS-Logophonie`
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "MADLEN <ne-pas-repondre@madlen.app>",
    to,
    subject: "Confirmez votre adresse e-mail - MADLEN",
    html,
    text,
  })
}
