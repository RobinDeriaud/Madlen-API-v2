import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// POST /api/users/[id]/patients — associe un patient au praticien
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id: rawId } = await params
  const userId = parseInt(rawId)
  if (isNaN(userId)) return Response.json({ error: "Invalid id" }, { status: 400 })

  const body = await req.json()
  const parsed = z.object({ userPatientId: z.number().int() }).safeParse(body)
  if (!parsed.success) return Response.json({ error: "Invalid input" }, { status: 400 })

  try {
    const praticien = await prisma.praticien.findUnique({ where: { userId } })
    if (!praticien) return Response.json({ error: "Praticien introuvable" }, { status: 404 })

    // Crée le profil patient si inexistant, sinon met à jour praticienId
    let patient = await prisma.patient.findUnique({
      where: { userId: parsed.data.userPatientId },
    })
    if (!patient) {
      patient = await prisma.patient.create({
        data: { userId: parsed.data.userPatientId, praticienId: praticien.id },
      })
    } else {
      await prisma.patient.update({
        where: { id: patient.id },
        data: { praticienId: praticien.id },
      })
    }

    return Response.json({ ok: true, patientId: patient.id })
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/users/[id]/patients — dissocie un patient du praticien
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id: rawId } = await params
  const userId = parseInt(rawId)
  if (isNaN(userId)) return Response.json({ error: "Invalid id" }, { status: 400 })

  const body = await req.json()
  const parsed = z.object({ patientId: z.number().int() }).safeParse(body)
  if (!parsed.success) return Response.json({ error: "Invalid input" }, { status: 400 })

  try {
    const praticien = await prisma.praticien.findUnique({ where: { userId } })
    if (!praticien) return Response.json({ error: "Praticien introuvable" }, { status: 404 })

    await prisma.patient.updateMany({
      where: { id: parsed.data.patientId, praticienId: praticien.id },
      data: { praticienId: null },
    })

    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
