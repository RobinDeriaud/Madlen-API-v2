import { requireUser } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const { error } = await requireUser(req)
  if (error) return error

  try {
    const url = new URL(req.url)
    const email = url.searchParams.get("email")
    if (!email) return Response.json({ error: "Paramètre email requis" }, { status: 400 })

    const patient = await prisma.patient.findFirst({
      where: { user: { email } },
      include: {
        user: { select: { id: true, email: true, nom: true, prenom: true } },
      },
    })

    if (!patient) return Response.json({ data: [] })

    return Response.json({ data: [patient] })
  } catch (err) {
    console.error("[GET /api/public/patients/search]", err)
    return Response.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
