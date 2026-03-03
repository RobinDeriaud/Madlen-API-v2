import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Madlen Admin",
  description: "Private admin dashboard",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  )
}
