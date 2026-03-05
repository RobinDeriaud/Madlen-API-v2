import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const exerciceNumbers = url.searchParams.get("exerciceNumbers")

    const where = exerciceNumbers
      ? { exercice: { numero: { in: exerciceNumbers.split(",").map(Number).filter(Boolean) } } }
      : {}

    const audioFiles = await prisma.audioFile.findMany({
      where,
      include: { exercice: { select: { numero: true } } },
      orderBy: { name: "asc" },
    })

    return Response.json({
      data: audioFiles.map((f) => ({
        name: f.name,
        url: f.url,
        mime: f.mime,
        size: f.size,
        ext: f.ext,
        exerciceNumero: f.exercice?.numero ?? null,
        uploadDate: f.createdAt,
      })),
      total: audioFiles.length,
      ...(exerciceNumbers ? { requestedNumbers: exerciceNumbers.split(",").map(Number).filter(Boolean) } : {}),
    })
  } catch (err) {
    console.error("[GET /api/public/exercices/audios]", err)
    return Response.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
