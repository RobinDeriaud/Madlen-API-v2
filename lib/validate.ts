import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["user", "admin"]).default("user"),
})

export type LoginInput = z.infer<typeof loginSchema>
export type CreateUserInput = z.infer<typeof createUserSchema>

/** Build a 400 Response from a Zod error, including per-field messages. */
export function zodFieldError(zodError: z.ZodError): Response {
  const fields: Record<string, string> = {}
  for (const err of zodError.errors) {
    const key = err.path.join(".")
    if (key && !fields[key]) fields[key] = err.message
  }
  const first = zodError.errors[0]
  const msg = first ? `${first.path.join(".")}: ${first.message}` : "Invalid input"
  return Response.json({ error: msg, fields }, { status: 400 })
}
