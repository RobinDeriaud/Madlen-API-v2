import { requireAdmin, parseId, parseBody, handlePrismaError } from "@/lib/api-helpers"
import { prisma } from "@/lib/prisma"
import { updateKitInstalledSchema, zodFieldError } from "@/lib/validate"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id: userId, error: idError } = parseId((await params).id)
  if (idError) return idError

  const { body, error: bodyError } = await parseBody(req)
  if (bodyError) return bodyError

  const parsed = updateKitInstalledSchema.safeParse(body)
  if (!parsed.success) return zodFieldError(parsed.error)

  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { kitInstalled: parsed.data.kitInstalled },
      select: { id: true, kitInstalled: true },
    })
    return Response.json(updated)
  } catch (err) {
    return handlePrismaError(err)
  }
}
