import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { updateKitInstalledSchema, zodFieldError } from "@/lib/validate"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  // id = userId
  const { id: rawId } = await params
  const userId = parseInt(rawId)
  if (isNaN(userId)) return Response.json({ error: "Invalid id" }, { status: 400 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

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
    if (err instanceof Error && "code" in err && err.code === "P2025") {
      return Response.json({ error: "Not found" }, { status: 404 })
    }
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
