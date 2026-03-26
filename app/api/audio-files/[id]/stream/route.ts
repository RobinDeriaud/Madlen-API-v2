import { requireAdmin, parseId } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { readAudioFile } from "@/lib/audio-storage"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id, error: idError } = parseId((await params).id)
  if (idError) return idError

  const record = await prisma.audioFile.findUnique({ where: { id } })
  if (!record) return new Response("Not found", { status: 404 })

  try {
    const buffer = await readAudioFile(id, record.ext ?? ".mp3")
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": record.mime ?? "audio/mpeg",
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch {
    return new Response("File not found", { status: 404 })
  }
}
