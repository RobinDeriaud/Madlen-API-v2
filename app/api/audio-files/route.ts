import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import path from "path"
import {
  ALLOWED_AUDIO_MIMES,
  MAX_AUDIO_FILE_SIZE,
  saveAudioFile,
  audioStreamUrl,
  deleteAudioFile,
} from "@/lib/audio-storage"

export async function GET() {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const files = await prisma.audioFile.findMany({
      include: { exercice: { select: { id: true, numero: true, nom: true } } },
      orderBy: { createdAt: "desc" },
    })
    return Response.json(files)
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

const metaSchema = z.object({
  exerciceId: z.coerce.number().int().positive().optional(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return Response.json({ error: "Le body doit être multipart/form-data" }, { status: 400 })
  }

  // Validate optional exerciceId
  const rawExerciceId = formData.get("exerciceId")
  const metaParsed = metaSchema.safeParse({
    exerciceId: rawExerciceId && rawExerciceId !== "" ? rawExerciceId : undefined,
  })
  if (!metaParsed.success) {
    return Response.json({ error: "exerciceId invalide" }, { status: 400 })
  }

  const exerciceId = metaParsed.data.exerciceId ?? null

  // Verify exercice exists if provided
  if (exerciceId) {
    const exercice = await prisma.exercice.findUnique({ where: { id: exerciceId } })
    if (!exercice) {
      return Response.json({ error: "Exercice introuvable", fields: { exerciceId: "Exercice introuvable" } }, { status: 404 })
    }
  }

  const rawFiles = formData.getAll("files")
  // Filter to only File objects (strings or other types are ignored)
  const files = rawFiles.filter((f): f is File => typeof f !== "string" && typeof f.arrayBuffer === "function")
  if (files.length === 0) {
    return Response.json({ error: "Aucun fichier fourni" }, { status: 400 })
  }

  // Validate all files first
  for (const file of files) {
    if (!ALLOWED_AUDIO_MIMES.includes(file.type)) {
      return Response.json(
        { error: `Type non autorisé : ${file.type} (${file.name})` },
        { status: 400 },
      )
    }
    if (file.size > MAX_AUDIO_FILE_SIZE) {
      return Response.json(
        { error: `Fichier trop volumineux : ${file.name} (max 20 MB)` },
        { status: 400 },
      )
    }
  }

  const created = []

  for (const file of files) {
    const ext = path.extname(file.name) || ".mp3"
    const name = path.basename(file.name, ext)
    const buffer = Buffer.from(await file.arrayBuffer())

    // Auto-detect exercice from filename pattern: exercice-{numero}-{iteration}
    let fileExerciceId = exerciceId
    if (!fileExerciceId) {
      const match = name.match(/^exercice-(\d+)(?:-\d+)?$/i)
      if (match) {
        const numero = parseInt(match[1])
        const found = await prisma.exercice.findFirst({ where: { numero } })
        if (found) fileExerciceId = found.id
      }
    }

    // 1. Create DB record with placeholder url
    let record
    try {
      record = await prisma.audioFile.create({
        data: {
          name,
          url: "",
          mime: file.type,
          size: buffer.length,
          ext,
          exerciceId: fileExerciceId,
        },
      })
    } catch {
      return Response.json({ error: "Internal server error" }, { status: 500 })
    }

    // 2. Write file to disk
    try {
      await saveAudioFile(record.id, ext, buffer)
    } catch {
      // Cleanup DB record on disk write failure
      await prisma.audioFile.delete({ where: { id: record.id } }).catch(() => {})
      return Response.json({ error: `Erreur d'écriture pour ${file.name}` }, { status: 500 })
    }

    // 3. Update url in DB
    try {
      const updated = await prisma.audioFile.update({
        where: { id: record.id },
        data: { url: audioStreamUrl(record.id) },
        include: { exercice: { select: { id: true, numero: true, nom: true } } },
      })
      created.push(updated)
    } catch {
      await deleteAudioFile(record.id, ext)
      await prisma.audioFile.delete({ where: { id: record.id } }).catch(() => {})
      return Response.json({ error: "Internal server error" }, { status: 500 })
    }
  }

  return Response.json(created, { status: 201 })
}
