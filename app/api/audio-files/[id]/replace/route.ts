import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import path from "path"
import {
  ALLOWED_AUDIO_MIMES,
  MAX_AUDIO_FILE_SIZE,
  saveAudioFile,
  deleteAudioFile,
} from "@/lib/audio-storage"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id: rawId } = await params
  const id = parseInt(rawId)
  if (isNaN(id)) return Response.json({ error: "Invalid id" }, { status: 400 })

  const record = await prisma.audioFile.findUnique({ where: { id } })
  if (!record) return Response.json({ error: "Not found" }, { status: 404 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return Response.json({ error: "Le body doit être multipart/form-data" }, { status: 400 })
  }

  const raw = formData.get("file")
  const file = (raw && typeof raw !== "string" && typeof raw.arrayBuffer === "function") ? raw as File : null
  if (!file) {
    return Response.json({ error: "Aucun fichier fourni" }, { status: 400 })
  }

  if (!ALLOWED_AUDIO_MIMES.includes(file.type)) {
    return Response.json({ error: `Type non autorisé : ${file.type}` }, { status: 400 })
  }

  if (file.size > MAX_AUDIO_FILE_SIZE) {
    return Response.json({ error: "Fichier trop volumineux (max 20 MB)" }, { status: 400 })
  }

  const ext = path.extname(file.name) || ".mp3"
  const buffer = Buffer.from(await file.arrayBuffer())

  // Delete old file (ext may differ)
  await deleteAudioFile(id, record.ext ?? "")

  // Write new file
  try {
    await saveAudioFile(id, ext, buffer)
  } catch {
    return Response.json({ error: "Erreur d'écriture du fichier" }, { status: 500 })
  }

  // Update DB — url stays the same, update mime/size/ext
  try {
    const updated = await prisma.audioFile.update({
      where: { id },
      data: { mime: file.type, size: buffer.length, ext },
      include: { exercice: { select: { id: true, numero: true, nom: true } } },
    })
    return Response.json(updated)
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
