import { requireAdmin, parseId, handlePrismaError } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  licenceActive: z.boolean(),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id, error: idError } = parseId((await params).id)
  if (idError) return idError

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "Données invalides" }, { status: 400 })
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: { licenceActive: parsed.data.licenceActive },
      select: {
        id: true,
        email: true,
        licenceActive: true,
        licenceProductName: true,
        licencePurchasedAt: true,
        licenceExpiresAt: true,
      },
    })
    return Response.json(user)
  } catch (err) {
    return handlePrismaError(err, { P2025: "Utilisateur introuvable" })
  }
}
