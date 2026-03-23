import { SignJWT, jwtVerify } from "jose"
import type { Patient, Praticien, User, UserType } from "@prisma/client"

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET)
const ALG = "HS256"

export async function signUserJwt(payload: { sub: string; email: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret)
}

export async function verifyUserJwt(
  token: string
): Promise<{ sub: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as { sub: string; email: string }
  } catch {
    return null
  }
}

type PraticienConfirmPayload = {
  patientUserId: number
  praticienId: number
  type: "praticien-confirmation"
}

export async function signPraticienConfirmJwt(payload: {
  patientUserId: number
  praticienId: number
}) {
  return new SignJWT({ ...payload, type: "praticien-confirmation" } satisfies PraticienConfirmPayload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret)
}

export async function verifyPraticienConfirmJwt(
  token: string
): Promise<PraticienConfirmPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    if (payload.type !== "praticien-confirmation") return null
    return payload as unknown as PraticienConfirmPayload
  } catch {
    return null
  }
}

// ─── Patient Setup Token ────────────────────────────────────────────────────
// Utilisé quand un praticien (ou l'admin) crée un compte patient.
// Le patient reçoit un email avec un lien vers /configurer-compte?token=xxx
// qui lui permet de définir son mot de passe et compléter son profil.
// À la validation, le praticien est automatiquement confirmé.
// Réutilisable hors admin panel : il suffit de signer ce JWT et d'envoyer
// l'email via sendPatientSetupEmail().

type PatientSetupPayload = {
  patientUserId: number
  praticienId: number
  type: "patient-setup"
}

export async function signPatientSetupJwt(payload: {
  patientUserId: number
  praticienId: number
}) {
  return new SignJWT({ ...payload, type: "patient-setup" } satisfies PatientSetupPayload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret)
}

export async function verifyPatientSetupJwt(
  token: string
): Promise<PatientSetupPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    if (payload.type !== "patient-setup") return null
    return payload as unknown as PatientSetupPayload
  } catch {
    return null
  }
}

type SuiviConfirmPayload = {
  suiviPatientId: number
  patientUserId: number
  praticienId: number
  type: "suivi-confirmation"
}

export async function signSuiviConfirmJwt(payload: {
  suiviPatientId: number
  patientUserId: number
  praticienId: number
}) {
  return new SignJWT({ ...payload, type: "suivi-confirmation" } satisfies SuiviConfirmPayload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret)
}

export async function verifySuiviConfirmJwt(
  token: string
): Promise<SuiviConfirmPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    if (payload.type !== "suivi-confirmation") return null
    return payload as unknown as SuiviConfirmPayload
  } catch {
    return null
  }
}

type UserWithProfiles = User & {
  profil_patient: Patient | null
  profil_praticien: Praticien | null
}

function toSiteUserType(userType: UserType): "patient" | "praticien" | null {
  if (userType === "PATIENT") return "patient"
  if (userType === "PRATICIEN") return "praticien"
  return null
}

const sexeMap: Record<string, string> = {
  FEMININ: "féminin",
  MASCULIN: "masculin",
}

function normalizePatient(patient: Patient) {
  return {
    ...patient,
    sexe: patient.sexe ? (sexeMap[patient.sexe] ?? patient.sexe) : patient.sexe,
  }
}

export function normalizeUser(user: UserWithProfiles) {
  return {
    id: user.id,
    username: user.email,
    email: user.email,
    provider: "local",
    confirmed: user.confirmed,
    blocked: false,
    nom: user.nom,
    prenom: user.prenom,
    user_type: toSiteUserType(user.user_type),
    profile_completed: user.user_type !== "NONE",
    profil_patient: user.profil_patient ? normalizePatient(user.profil_patient) : null,
    profil_praticien: user.profil_praticien ?? null,
  }
}
