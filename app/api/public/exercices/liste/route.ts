import { requireUser } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const { error } = await requireUser(req)
  if (error) return error

  try {
    const exercices = await prisma.exercice.findMany({
      select: { id: true, nom: true, numero: true },
      orderBy: { numero: "asc" },
    })

    return Response.json({ data: exercices })
  } catch (err) {
    console.error("[GET /api/public/exercices/liste]", err)
    return Response.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
