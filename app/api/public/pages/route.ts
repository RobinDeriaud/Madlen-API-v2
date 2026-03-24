import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const slug = url.searchParams.get("slug")

    if (slug) {
      const page = await prisma.pageStatique.findFirst({
        where: { slug, publishedAt: { not: null } },
      })
      if (!page) return Response.json({ error: "Page introuvable" }, { status: 404 })
      return Response.json({ data: page })
    }

    const pages = await prisma.pageStatique.findMany({
      where: { publishedAt: { not: null } },
      orderBy: { createdAt: "asc" },
    })

    return Response.json({ data: pages })
  } catch (err) {
    console.error("[GET /api/public/pages]", err)
    return Response.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
