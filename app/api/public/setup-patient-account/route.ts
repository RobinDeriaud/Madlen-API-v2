import { prisma } from "@/lib/prisma"
import { verifyPatientSetupJwt, signUserJwt } from "@/lib/user-jwt"
import bcrypt from "bcryptjs"
import { z } from "zod"

// ─── GET /api/public/setup-patient-account?token=xxx ────────────────────────
// Vérifie le token et retourne les infos pré-remplies du patient.
// Appelé par la page /configurer-compte du site pour pré-remplir le formulaire.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get("token")

  if (!token) {
    return Response.json({ error: "Token manquant" }, { status: 400 })
  }

  const payload = await verifyPatientSetupJwt(token)
  if (!payload) {
    return Response.json({ error: "Lien invalide ou expiré" }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.patientUserId },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        profil_patient: { select: { age: true, sexe: true } },
      },
    })

    if (!user) {
      return Response.json({ error: "Utilisateur introuvable" }, { status: 404 })
    }

    // Vérifier que le compte n'est pas déjà configuré
    const fullUser = await prisma.user.findUnique({
      where: { id: payload.patientUserId },
      select: { passwordHash: true },
    })
    if (fullUser && fullUser.passwordHash !== "!SETUP_PENDING") {
      return Response.json({ error: "Ce compte est déjà configuré", alreadySetup: true }, { status: 409 })
    }

    return Response.json({
      email: user.email,
      nom: user.nom,
      prenom: user.prenom,
      age: user.profil_patient?.age ?? null,
      sexe: user.profil_patient?.sexe ?? null,
      praticienId: payload.praticienId,
    })
  } catch (err) {
    console.error("[GET /api/public/setup-patient-account]", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ─── POST /api/public/setup-patient-account ─────────────────────────────────
// Finalise le compte patient : définit le mot de passe, complète le profil,
// confirme l'email et auto-confirme l'affiliation praticien.
//
// Body: { token, password, passwordConfirmation, prenom, nom, age, sexe }
//
// Retourne un JWT de connexion pour que le patient soit connecté directement.
// Réutilisable : ce endpoint est public, le token JWT sert d'authentification.

const setupSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  passwordConfirmation: z.string().min(8),
  prenom: z.string().min(1, "Le prénom est requis"),
  nom: z.string().min(1, "Le nom est requis"),
  age: z.number().int().positive("L'âge doit être positif"),
  sexe: z.enum(["FEMININ", "MASCULIN"], { message: "Le sexe est requis" }),
}).refine((data) => data.password === data.passwordConfirmation, {
  message: "Les mots de passe ne correspondent pas",
  path: ["passwordConfirmation"],
})

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = setupSchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.errors[0]
    const msg = first ? first.message : "Données invalides"
    return Response.json({ error: msg }, { status: 400 })
  }

  const { token, password, prenom, nom, age, sexe } = parsed.data

  // Vérifier le token JWT
  const payload = await verifyPatientSetupJwt(token)
  if (!payload) {
    return Response.json({ error: "Lien invalide ou expiré" }, { status: 401 })
  }

  try {
    // Vérifier que le compte n'est pas déjà configuré
    const user = await prisma.user.findUnique({
      where: { id: payload.patientUserId },
      select: { id: true, email: true, passwordHash: true },
    })

    if (!user) {
      return Response.json({ error: "Utilisateur introuvable" }, { status: 404 })
    }

    if (user.passwordHash !== "!SETUP_PENDING") {
      return Response.json({ error: "Ce compte est déjà configuré" }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    // Mettre à jour le user : mot de passe, nom, prénom, confirmed
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        prenom,
        nom,
        confirmed: true,
        user_type: "PATIENT",
      },
    })

    // Mettre à jour le profil patient : age, sexe + auto-confirmer le praticien
    await prisma.patient.upsert({
      where: { userId: user.id },
      update: {
        age,
        sexe,
        praticienId: payload.praticienId,
        praticienConfirmStatus: "CONFIRMED",
      },
      create: {
        userId: user.id,
        age,
        sexe,
        praticienId: payload.praticienId,
        praticienConfirmStatus: "CONFIRMED",
      },
    })

    // Générer un JWT de connexion pour le patient
    const jwt = await signUserJwt({ sub: String(user.id), email: user.email })

    return Response.json({ ok: true, jwt })
  } catch (err) {
    console.error("[POST /api/public/setup-patient-account]", err)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
