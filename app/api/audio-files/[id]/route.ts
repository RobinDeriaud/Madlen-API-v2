import { auth } from "@/lib/auth"
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
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id: rawId } = await params
  const id = parseInt(rawId)
  if (isNaN(id)) return Response.json({ error: "Invalid id" }, { status: 400 })

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
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id: rawId } = await params
  const id = parseInt(rawId)
  if (isNaN(id)) return Response.json({ error: "Invalid id" }, { status: 400 })

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
    if (err instanceof Error && "code" in err && err.code === "P2025") {
      return Response.json({ error: "Not found" }, { status: 404 })
    }
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id: rawId } = await params
  const id = parseInt(rawId)
  if (isNaN(id)) return Response.json({ error: "Invalid id" }, { status: 400 })

  try {
    const record = await prisma.audioFile.findUnique({ where: { id } })
    if (!record) return Response.json({ error: "Not found" }, { status: 404 })

    await prisma.audioFile.delete({ where: { id } })
    await deleteAudioFile(id, record.ext ?? "")

    return Response.json({ ok: true })
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === "P2025") {
      return Response.json({ error: "Not found" }, { status: 404 })
    }
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
