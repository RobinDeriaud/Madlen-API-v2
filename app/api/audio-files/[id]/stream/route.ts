import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { readAudioFile } from "@/lib/audio-storage"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return new Response("Unauthorized", { status: 401 })

  const { id: rawId } = await params
  const id = parseInt(rawId)
  if (isNaN(id)) return new Response("Not found", { status: 404 })

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
