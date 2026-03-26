import { z } from "zod"

export const BCRYPT_ROUNDS = 12

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["user", "admin"]).default("user"),
})

export const createAdminUserSchema = z.object({
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  role: z.enum(["user", "admin"]).default("admin"),
  notifications: z.boolean().default(false),
})

export const updateAdminUserSchema = z.object({
  email: z.string().email("Adresse email invalide").optional(),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères").optional(),
  role: z.enum(["user", "admin"]).optional(),
  notifications: z.boolean().optional(),
})

export const updateKitInstalledSchema = z.object({
  kitInstalled: z.boolean(),
})

export type UpdateKitInstalledInput = z.infer<typeof updateKitInstalledSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type CreateUserInput = z.infer<typeof createUserSchema>
export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>
export type UpdateAdminUserInput = z.infer<typeof updateAdminUserSchema>

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
