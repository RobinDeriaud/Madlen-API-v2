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

const prescriptionInclude = {
  praticienCreator: {
    include: { user: { select: { id: true, nom: true, prenom: true } } },
  },
  suiviPatient: {
    include: {
      patient: { include: { user: { select: { id: true, nom: true, prenom: true } } } },
      praticien: { include: { user: { select: { id: true, nom: true, prenom: true } } } },
    },
  },
}

export async function GET(req: Request) {
  const userId = await authenticate(req)
  if (!userId) return Response.json({ error: "Token manquant ou invalide" }, { status: 401 })

  try {
    const url = new URL(req.url)
    const id = url.searchParams.get("id")
    const suiviPatientId = url.searchParams.get("suiviPatientId")

    // Single prescription
    if (id) {
      const prescription = await prisma.prescription.findUnique({
        where: { id: parseInt(id) },
        include: prescriptionInclude,
      })
      if (!prescription) return Response.json({ error: "Prescription introuvable" }, { status: 404 })

      // Ownership: praticien creator or patient of suivi
      const isCreator = prescription.praticienCreator.userId === userId
      const isPatient = prescription.suiviPatient.patient.userId === userId
      if (!isCreator && !isPatient) return Response.json({ error: "Accès refusé" }, { status: 403 })

      return Response.json({ data: prescription })
    }

    // By suiviPatientId
    if (suiviPatientId) {
      const suivi = await prisma.suiviPatient.findUnique({
        where: { id: parseInt(suiviPatientId) },
        include: { praticien: true, patient: true },
      })
      if (!suivi) return Response.json({ error: "Suivi introuvable" }, { status: 404 })
      if (suivi.praticien.userId !== userId && suivi.patient.userId !== userId) {
        return Response.json({ error: "Accès refusé" }, { status: 403 })
      }

      const prescriptions = await prisma.prescription.findMany({
        where: { suiviPatientId: suivi.id },
        include: prescriptionInclude,
        orderBy: { createdAt: "desc" },
      })
      return Response.json({ data: prescriptions })
    }

    // All prescriptions for the current praticien
    const praticien = await prisma.praticien.findUnique({ where: { userId } })
    if (praticien) {
      const prescriptions = await prisma.prescription.findMany({
        where: { praticienCreatorId: praticien.id },
        include: prescriptionInclude,
        orderBy: { createdAt: "desc" },
      })
      return Response.json({ data: prescriptions })
    }

    // Patient: get prescriptions for their suivis
    const patient = await prisma.patient.findUnique({ where: { userId } })
    if (patient) {
      const prescriptions = await prisma.prescription.findMany({
        where: { suiviPatient: { patientId: patient.id } },
        include: prescriptionInclude,
        orderBy: { createdAt: "desc" },
      })
      return Response.json({ data: prescriptions })
    }

    return Response.json({ data: [] })
  } catch (err) {
    console.error("[GET /api/public/prescriptions]", err)
    return Response.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

const createSchema = z.object({
  suiviPatientId: z.number().int().positive(),
  isActive: z.boolean().default(true),
  deliveredAt: z.string().datetime().optional().nullable(),
  exercicesParJour: z.number().int().optional().nullable(),
  exercices: z.any().default([]),
  parcours: z.any().default([]),
})

export async function POST(req: Request) {
  const userId = await authenticate(req)
  if (!userId) return Response.json({ error: "Token manquant ou invalide" }, { status: 401 })

  try {
    const praticien = await prisma.praticien.findUnique({ where: { userId } })
    if (!praticien) return Response.json({ error: "Seul un praticien peut créer une prescription" }, { status: 403 })

    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return Response.json({ error: "Données invalides" }, { status: 400 })

    // Verify suivi belongs to this praticien
    const suivi = await prisma.suiviPatient.findUnique({
      where: { id: parsed.data.suiviPatientId },
    })
    if (!suivi) return Response.json({ error: "Suivi introuvable" }, { status: 404 })
    if (suivi.praticienId !== praticien.id) return Response.json({ error: "Accès refusé" }, { status: 403 })

    const prescription = await prisma.prescription.create({
      data: {
        praticienCreatorId: praticien.id,
        suiviPatientId: suivi.id,
        isActive: parsed.data.isActive,
        deliveredAt: parsed.data.deliveredAt ? new Date(parsed.data.deliveredAt) : null,
        exercicesParJour: parsed.data.exercicesParJour ?? null,
        exercices: parsed.data.exercices,
        parcours: parsed.data.parcours,
      },
      include: prescriptionInclude,
    })

    return Response.json({ data: prescription }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/public/prescriptions]", err)
    return Response.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

const updateSchema = z.object({
  id: z.number().int().positive(),
  isActive: z.boolean().optional(),
  deliveredAt: z.string().datetime().optional().nullable(),
  exercicesParJour: z.number().int().optional().nullable(),
  exercices: z.any().optional(),
  parcours: z.any().optional(),
})

export async function PUT(req: Request) {
  const userId = await authenticate(req)
  if (!userId) return Response.json({ error: "Token manquant ou invalide" }, { status: 401 })

  try {
    const praticien = await prisma.praticien.findUnique({ where: { userId } })
    if (!praticien) return Response.json({ error: "Seul un praticien peut modifier une prescription" }, { status: 403 })

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return Response.json({ error: "Données invalides" }, { status: 400 })

    const existing = await prisma.prescription.findUnique({ where: { id: parsed.data.id } })
    if (!existing) return Response.json({ error: "Prescription introuvable" }, { status: 404 })
    if (existing.praticienCreatorId !== praticien.id) return Response.json({ error: "Accès refusé" }, { status: 403 })

    const { id, deliveredAt, ...rest } = parsed.data
    const updated = await prisma.prescription.update({
      where: { id },
      data: {
        ...rest,
        ...(deliveredAt !== undefined ? { deliveredAt: deliveredAt ? new Date(deliveredAt) : null } : {}),
      },
      include: prescriptionInclude,
    })

    return Response.json({ data: updated })
  } catch (err) {
    console.error("[PUT /api/public/prescriptions]", err)
    return Response.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const userId = await authenticate(req)
  if (!userId) return Response.json({ error: "Token manquant ou invalide" }, { status: 401 })

  try {
    const praticien = await prisma.praticien.findUnique({ where: { userId } })
    if (!praticien) return Response.json({ error: "Seul un praticien peut supprimer une prescription" }, { status: 403 })

    const url = new URL(req.url)
    const id = url.searchParams.get("id")
    if (!id) return Response.json({ error: "Paramètre id requis" }, { status: 400 })

    const existing = await prisma.prescription.findUnique({ where: { id: parseInt(id) } })
    if (!existing) return Response.json({ error: "Prescription introuvable" }, { status: 404 })
    if (existing.praticienCreatorId !== praticien.id) return Response.json({ error: "Accès refusé" }, { status: 403 })

    await prisma.prescription.delete({ where: { id: parseInt(id) } })

    return Response.json({ ok: true })
  } catch (err) {
    console.error("[DELETE /api/public/prescriptions]", err)
    return Response.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
