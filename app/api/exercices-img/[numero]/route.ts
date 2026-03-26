import { requireAdmin } from "@/lib/api-helpers"
import { readFile } from "fs/promises"
import path from "path"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ numero: string }> }
) {
  const { error } = await requireAdmin()
  if (error) return error

  const { numero } = await params

  // Sanitize: only allow digits
  if (!/^\d+$/.test(numero)) {
    return new Response("Not found", { status: 404 })
  }

  const imgPath = path.join(
    process.cwd(),
    "..",
    "Madlen-Site",
    "public",
    "exercices-img",
    `image${numero}.png`
  )

  try {
    const buffer = await readFile(imgPath)
    return new Response(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch {
    return new Response("Not found", { status: 404 })
  }
}
