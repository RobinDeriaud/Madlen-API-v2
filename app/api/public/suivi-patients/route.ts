import { prisma } from "@/lib/prisma"
import { verifyUserJwt } from "@/lib/user-jwt"
import { z } from "zod"

async function authenticate(req: Request) {
  const authHeader = req.headers.get("authorization")
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
  if (!token) return null
  const payload = await verifyUserJwt(token)
  if (!payload) return null
  const userId = parseInt(payload.sub)
  if (!userId || isNaN(userId)) return null
  return userId
}

async function getPraticienByUserId(userId: number) {
  return prisma.praticien.findUnique({ where: { userId } })
}

const suiviInclude = {
  patient: {
    include: { user: { select: { id: true, email: true, nom: true, prenom: true } } },
  },
  praticien: {
    include: { user: { select: { id: true, email: true, nom: true, prenom: true } } },
  },
}

export async function GET(req: Request) {
  const userId = await authenticate(req)
  if (!userId) return Response.json({ error: "Token manquant ou invalide" }, { status: 401 })

  try {
    const url = new URL(req.url)
    const id = url.searchParams.get("id")

    // Single suivi by id
    if (id) {
      const suivi = await prisma.suiviPatient.findUnique({
        where: { id: parseInt(id) },
        include: suiviInclude,
      })
      if (!suivi) return Response.json({ error: "Suivi introuvable" }, { status: 404 })

      // Ownership check: praticien or patient
      if (suivi.praticien.userId !== userId && suivi.patient.userId !== userId) {
        return Response.json({ error: "Accès refusé" }, { status: 403 })
      }

      return Response.json({ data: suivi })
    }

    // All suivis for the current user (praticien or patient)
    const praticien = await getPraticienByUserId(userId)
    if (praticien) {
      const suivis = await prisma.suiviPatient.findMany({
        where: { praticienId: praticien.id },
        include: suiviInclude,
        orderBy: { createdAt: "desc" },
      })
      return Response.json({ data: suivis })
    }

    // Check if patient
    const patient = await prisma.patient.findUnique({ where: { userId } })
    if (patient) {
      const suivis = await prisma.suiviPatient.findMany({
        where: { patientId: patient.id },
        include: suiviInclude,
        orderBy: { createdAt: "desc" },
      })
      return Response.json({ data: suivis })
    }

    return Response.json({ data: [] })
  } catch (err) {
    console.error("[GET /api/public/suivi-patients]", err)
    return Response.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

const createSchema = z.object({
  patientId: z.number().int().positive(),
})

export async function POST(req: Request) {
  const userId = await authenticate(req)
  if (!userId) return Response.json({ error: "Token manquant ou invalide" }, { status: 401 })

  try {
    const praticien = await getPraticienByUserId(userId)
    if (!praticien) return Response.json({ error: "Seul un praticien peut créer un suivi" }, { status: 403 })

    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return Response.json({ error: "Données invalides" }, { status: 400 })

    const patient = await prisma.patient.findUnique({ where: { id: parsed.data.patientId } })
    if (!patient) return Response.json({ error: "Patient introuvable" }, { status: 404 })

    // Check no existing active suivi
    const existing = await prisma.suiviPatient.findFirst({
      where: { patientId: patient.id, praticienId: praticien.id, archived: false },
    })
    if (existing) return Response.json({ error: "Un suivi existe déjà pour ce patient" }, { status: 409 })

    const suivi = await prisma.suiviPatient.create({
      data: {
        patientId: patient.id,
        praticienId: praticien.id,
        isConfirmed: false,
        archived: false,
        actif: true,
      },
      include: suiviInclude,
    })

    return Response.json({ data: suivi }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/public/suivi-patients]", err)
    return Response.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

const updateSchema = z.object({
  id: z.number().int().positive(),
  isConfirmed: z.boolean().optional(),
  archived: z.boolean().optional(),
  dateDebutSuivi: z.string().datetime().optional().nullable(),
})

export async function PUT(req: Request) {
  const userId = await authenticate(req)
  if (!userId) return Response.json({ error: "Token manquant ou invalide" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return Response.json({ error: "Données invalides" }, { status: 400 })

    const suivi = await prisma.suiviPatient.findUnique({
      where: { id: parsed.data.id },
      include: { praticien: true, patient: true },
    })
    if (!suivi) return Response.json({ error: "Suivi introuvable" }, { status: 404 })

    // Ownership check
    if (suivi.praticien.userId !== userId && suivi.patient.userId !== userId) {
      return Response.json({ error: "Accès refusé" }, { status: 403 })
    }

    const { id, ...updateData } = parsed.data
    const updated = await prisma.suiviPatient.update({
      where: { id },
      data: {
        ...(updateData.isConfirmed !== undefined ? { isConfirmed: updateData.isConfirmed } : {}),
        ...(updateData.archived !== undefined ? { archived: updateData.archived } : {}),
        ...(updateData.dateDebutSuivi !== undefined
          ? { dateDebutSuivi: updateData.dateDebutSuivi ? new Date(updateData.dateDebutSuivi) : null }
          : {}),
      },
      include: suiviInclude,
    })

    return Response.json({ data: updated })
  } catch (err) {
    console.error("[PUT /api/public/suivi-patients]", err)
    return Response.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
