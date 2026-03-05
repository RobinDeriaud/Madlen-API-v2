import { prisma } from "@/lib/prisma"
import { verifyUserJwt } from "@/lib/user-jwt"
import type { Prisma, MacroExercice, AxeExercice, Recurrence } from "@prisma/client"

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
  if (!token) return Response.json({ error: "Token manquant" }, { status: 401 })

  const payload = await verifyUserJwt(token)
  if (!payload) return Response.json({ error: "Token invalide ou expiré" }, { status: 401 })

  try {
    const url = new URL(req.url)
    const id = url.searchParams.get("id")

    // Fetch single exercice by id
    if (id) {
      const exercice = await prisma.exercice.findUnique({
        where: { id: parseInt(id) },
        include: { listeElements: { orderBy: { order: "asc" } }, audioFiles: true },
      })
      if (!exercice) return Response.json({ error: "Exercice introuvable" }, { status: 404 })
      return Response.json({ data: exercice })
    }

    // Build filters
    const where: Prisma.ExerciceWhereInput = {}

    const numero = url.searchParams.get("numero")
    if (numero) where.numero = parseInt(numero)

    const macro = url.searchParams.get("macro")
    if (macro) where.macro = macro as MacroExercice

    const axe = url.searchParams.get("axe")
    if (axe) where.axe = axe as AxeExercice

    const bouton = url.searchParams.get("bouton")
    if (bouton) where.boutons = { path: [], array_contains: bouton }

    const recurrence = url.searchParams.get("recurrence")
    if (recurrence) where.recurrence = recurrence as Recurrence

    const search = url.searchParams.get("search")
    if (search) {
      where.OR = [
        { nom: { contains: search, mode: "insensitive" } },
        { auteur: { contains: search, mode: "insensitive" } },
        { sigle: { contains: search, mode: "insensitive" } },
        { bref: { contains: search, mode: "insensitive" } },
      ]
    }

    const page = parseInt(url.searchParams.get("page") ?? "1")
    const pageSize = Math.min(parseInt(url.searchParams.get("pageSize") ?? "25"), 200)

    const [data, total] = await Promise.all([
      prisma.exercice.findMany({
        where,
        include: { listeElements: { orderBy: { order: "asc" } }, audioFiles: true },
        orderBy: { numero: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.exercice.count({ where }),
    ])

    return Response.json({
      data,
      meta: { pagination: { page, pageSize, pageCount: Math.ceil(total / pageSize), total } },
    })
  } catch (err) {
    console.error("[GET /api/public/exercices]", err)
    return Response.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
