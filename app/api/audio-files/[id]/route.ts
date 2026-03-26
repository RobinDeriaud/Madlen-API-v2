import { requireAdmin, parseId, handlePrismaError } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { zodFieldError } from "@/lib/validate"
import { deleteAudioFile } from "@/lib/audio-storage"
import { z } from "zod"

const updateSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(255).optional(),
  exerciceId: z.number().int().positive().nullable().optional(),
})

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id, error: idError } = parseId((await params).id)
  if (idError) return idError

  try {
    const file = await prisma.audioFile.findUnique({
      where: { id },
      include: { exercice: { select: { id: true, numero: true, nom: true } } },
    })
    if (!file) return Response.json({ error: "Not found" }, { status: 404 })
    return Response.json(file)
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id, error: idError } = parseId((await params).id)
  if (idError) return idError

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return zodFieldError(parsed.error)

  try {
    const updated = await prisma.audioFile.update({
      where: { id },
      data: parsed.data,
      include: { exercice: { select: { id: true, numero: true, nom: true } } },
    })
    return Response.json(updated)
  } catch (err) {
    return handlePrismaError(err)
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id, error: idError } = parseId((await params).id)
  if (idError) return idError

  try {
    const record = await prisma.audioFile.findUnique({ where: { id } })
    if (!record) return Response.json({ error: "Not found" }, { status: 404 })

    await prisma.audioFile.delete({ where: { id } })
    await deleteAudioFile(id, record.ext ?? "")

    return Response.json({ ok: true })
  } catch (err) {
    return handlePrismaError(err)
  }
}
