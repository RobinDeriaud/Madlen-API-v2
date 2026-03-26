# Madlen-API-v2 — Claude Code Reference

## Overview

Dashboard admin + API publique. Remplace l'ancien backend Strapi.
**Stack** : Next.js 14+ (App Router), TypeScript, Prisma 7 (adapter pg), NextAuth v5, Zod, Tailwind, Stripe, Nodemailer.
**Production** : `https://api.madlen.app` — port 3001.
**Repo voisin** : `../Madlen-Site` (frontend Next.js, `https://madlen.app`).
**Pattern BFF** : `Browser → Madlen-Site /api/* → Madlen-API-v2 /api/* → PostgreSQL`

---

## Deux systèmes d'auth

| Aspect | Admin (Dashboard) | App Users (API publique) |
|---|---|---|
| Lib | `lib/auth.ts` | `lib/user-jwt.ts` |
| Tech | NextAuth v5, session JWT | jose HS256 JWT |
| Guard | `const session = await auth()` | `const payload = await verifyUserJwt(token)` |
| Modèle DB | `AdminUser` (table `admin_users`) | `User` (table `users`) |
| Password | bcryptjs (12 rounds) | bcryptjs (12 rounds) |

### Guard route admin (NextAuth)
```ts
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
  // ...
}
```

### Guard route publique (JWT Bearer)
```ts
import { verifyUserJwt } from "@/lib/user-jwt"

export async function GET(req: Request) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "")
  if (!token) return Response.json({ error: "Missing token" }, { status: 401 })
  const payload = await verifyUserJwt(token)
  if (!payload) return Response.json({ error: "Invalid token" }, { status: 401 })
  const userId = Number(payload.sub)
  // ...
}
```

---

## Routes API — Inventaire complet

### Routes admin (protégées NextAuth `auth()`)

| Path | Méthodes | Description |
|---|---|---|
| `/api/admin-users` | GET, POST | Lister / créer admins |
| `/api/admin-users/[id]` | GET, PUT, DELETE | CRUD admin (empêche auto-suppression) |
| `/api/exercices` | GET, POST | Lister / créer exercices |
| `/api/exercices/[id]` | GET, PUT, PATCH | Lire / modifier / toggle publish |
| `/api/exercices/[id]/liste-elements` | GET, PUT | Checklist items (batch replace) |
| `/api/exercices-img/[numero]` | GET | Proxy image depuis `../Madlen-Site/public/` |
| `/api/audio-files` | GET, POST | Lister / upload audio (multipart, max 20MB) |
| `/api/audio-files/[id]` | GET, PUT, DELETE | CRUD audio metadata + suppression fichier |
| `/api/audio-files/[id]/replace` | POST | Remplacer fichier audio sur disque |
| `/api/audio-files/[id]/stream` | GET | Stream binaire audio |
| `/api/users` | GET, POST | Recherche / création users (+ profils) |
| `/api/users/[id]` | GET, PUT, DELETE | CRUD user (cascade profils + listes) |
| `/api/users/[id]/patients` | POST, DELETE | Attacher / détacher patient-praticien |
| `/api/users/[id]/listes` | GET, POST | Listes d'exercices du patient |
| `/api/users/[id]/listes/[listeId]` | GET, PUT, DELETE | CRUD liste (activation = désactive les autres) |
| `/api/pages` | GET, POST | Lister / créer pages statiques |
| `/api/pages/[id]` | GET, PUT, PATCH, DELETE | CRUD page + toggle publish |
| `/api/kit-installations` | GET, POST | GET = liste users avec kit ; POST = sync unifiée Stripe (licence + kit, vérifie remboursements) |
| `/api/kit-installations/[id]` | PATCH | Marquer kit installé |

### Routes publiques (JWT ou sans auth)

| Path | Méthodes | Auth | Description |
|---|---|---|---|
| `/api/public/login` | POST | — | Login, retourne JWT 30j |
| `/api/public/register` | POST | — | Inscription + email confirmation |
| `/api/public/me` | GET | JWT | Profil utilisateur courant |
| `/api/public/profile` | PUT | JWT | Modifier profil (nom, prenom, etc.) |
| `/api/public/forgot-password` | POST | — | Envoie email reset (anti-enum: toujours 200) |
| `/api/public/reset-password` | POST | — | Reset password via token |
| `/api/public/change-password` | POST | JWT | Changer mot de passe (vérifie ancien) |
| `/api/public/request-email-change` | POST | JWT | Demande changement email |
| `/api/public/confirm-email-change` | POST | — | Confirme changement email via token |
| `/api/confirm-email` | GET | — | Confirmation email inscription (query `token`) |
| `/api/public/setup-patient-account` | GET, POST | token | Setup compte patient (depuis invitation praticien) |
| `/api/public/confirm-praticien` | POST | token | Patient confirme affiliation praticien |
| `/api/public/exercices` | GET | JWT | Exercices publiés (pagination, filtres, recherche) |
| `/api/public/exercices/liste` | GET | JWT | Liste simple exercices (id, nom, numero) |
| `/api/public/exercices/audios` | GET | — | Audios par numéros d'exercice |
| `/api/public/pages` | GET | — | Pages statiques publiées (par slug) |
| `/api/public/patients/search` | GET | JWT | Recherche patient par email |
| `/api/public/prescriptions` | GET, POST, PUT, DELETE | JWT | CRUD prescriptions (contrôle d'accès praticien/patient) |
| `/api/public/suivi-patients` | GET, POST, PUT | JWT | CRUD suivis patient-praticien |
| `/api/public/suivi-patients/send-invitation` | POST | JWT | Email invitation à un patient potentiel |
| `/api/public/suivi-patients/send-confirmation` | POST | JWT | Email confirmation suivi |
| `/api/public/suivi-patients/confirm` | POST | JWT+token | Patient confirme suivi via token |
| `/api/public/checkout` | POST | JWT | Crée session Stripe Checkout |
| `/api/public/stripe/products` | GET | JWT | Liste produits Stripe (filtré par user_type) |
| `/api/public/stripe/license` | GET | JWT | Vérifie licence utilisateur via Stripe |
| `/api/webhooks/stripe` | POST | signature | Webhook Stripe (checkout.completed, charge.refunded) |

### Autres routes

| Path | Description |
|---|---|
| `/api/auth/[...nextauth]` | Handler NextAuth (GET/POST) |
| `/api/swagger` | Spec OpenAPI JSON |
| `/api-docs` | Swagger UI (page) |

---

## Modèles Prisma

| Modèle | Table | Champs clés | Relations |
|---|---|---|---|
| `AdminUser` | `admin_users` | id, email, passwordHash, role, notifications | — |
| `User` | `users` | id, email, passwordHash, nom, prenom, confirmed, user_type, kitInstalled, kitPurchasedAt, tokens email/password/emailChange | → Patient?, Praticien? |
| `Praticien` | `praticiens` | id, numero_adeli | → User, Patient[], SuiviPatient[], Prescription[] |
| `Patient` | `patients` | id, age, sexe, praticienConfirmStatus | → User, Praticien?, Liste[], SuiviPatient[] |
| `Liste` | `listes` | id, nom, date, isActive | → Patient, Exercice[] |
| `Exercice` | `exercices` | id, numero (unique), nom, sigle, bref, but, instructions, astuce, commentaires, axe, macro, outil, outil_param, duree, recurrence, boutons (Json), fichier | → Liste[], ListeElement[], AudioFile[] |
| `ListeElement` | `liste_elements` | id, element, reponse, order | → Exercice |
| `PageStatique` | `page_statiques` | id, nom, slug (unique), contenu, date_modified | — |
| `SuiviPatient` | `suivi_patients` | id, isConfirmed, archived, actif, dateDebutSuivi | → Patient, Praticien, Prescription[] |
| `Prescription` | `prescriptions` | id, isActive, deliveredAt, exercicesParJour, exercices (Json), parcours (Json) | → Praticien (creator), SuiviPatient |
| `AudioFile` | `audio_files` | id, name, url, mime, size, ext | → Exercice |

---

## Enums

| Enum | Valeurs (DB-mappées) |
|---|---|
| `UserType` | NONE(`null`), PATIENT(`patient`), PRATICIEN(`praticien`) |
| `Sexe` | FEMININ(`féminin`), MASCULIN(`masculin`) |
| `Recurrence` | FAIBLE(`faible`), MOYENNE(`moyenne`), HAUTE(`haute`) |
| `ReponseElement` | NULL(`null`), OUI(`oui`), NON(`non`) |
| `PraticienConfirmStatus` | PENDING(`pending`), CONFIRMED(`confirmed`), REFUSED(`refused`) |
| `OutilExercice` | SPECTROGRAMME, PROSODIE, PUISSANCE, IMAGE, DIADO, PHONEME, PHONETOGRAMME, MOTS, TRAITS, PRAXIES, CHOIX, VIDEO, LIEN, HISTOGRAMME |
| `MacroExercice` | AJUSTEMENT_100, HYGIENE_PHONATOIRE_200, PRAXIES_300, RENDEMENT_VOCAL_400, FLEXIBILITE_VOCALE_500, INTELLIGIBILITE_600, FLUENCE_700 |
| `AxeExercice` | AJUSTEMENT_100, REGULATION_ECHANGES_130, POSTURE_140, HYGIENE_ALIMENTAIRE_210, ECONOMIE_VOCALE_220, ECHAUFFEMENT_RECUPERATION_230, EXERCICES_SPECIFIQUES_240, PROPRIOCEPTION_ARTICULATOIRE_310, PRAXIES_SIMPLES_320, PRAXIES_COORDONNEES_330, RESPIRATION_410, RESPIRATION_AVANCEE_420, TONICITE_LABIALE_430, TONICITE_VELAIRE_440, TONICITE_LINGUALE_450, CONTROLE_HAUTEUR_510, PASSAGES_MECANISMES_520, CONTROLE_INTENSITE_530, DISSOCIATION_PARAMETRES_540, DYNAMIQUE_VOCALE_550, PRODUCTION_VOYELLES_610, PRODUCTION_CONSONNES_620, SYLLABES_PROCESSUS_630, TRAVAIL_PROSODIE_640, DIADOCOCINETIQUES_CONSONANTIQUES_710, DIADOCOCINETIQUES_VOCALIQUES_720, DIADOCOCINETIQUES_COORDONNEES_730, DIADOCOCINETIQUES_MOTS_740, PHRASES_FONCTIONNELLES_750 |

---

## Fichiers lib/

| Fichier | Purpose | Exports clés |
|---|---|---|
| `lib/prisma.ts` | Prisma 7 singleton (PrismaPg adapter, pool max:10) | `prisma` |
| `lib/auth.ts` | NextAuth v5 config (Credentials provider) | `handlers, auth, signIn, signOut` |
| `auth.config.ts` | Config auth Edge-safe (pas de Node.js imports) | `authConfig` |
| `lib/user-jwt.ts` | JWT users (jose HS256) + normalisation | `signUserJwt, verifyUserJwt, signPraticienConfirmJwt, verifyPraticienConfirmJwt, signPatientSetupJwt, verifyPatientSetupJwt, signSuiviConfirmJwt, verifySuiviConfirmJwt, normalizeUser` |
| `lib/validate.ts` | Zod schemas partagés | `loginSchema, createUserSchema, createAdminUserSchema, updateAdminUserSchema, updateKitInstalledSchema, zodFieldError` |
| `lib/mailer.ts` | Nodemailer + templates HTML | 10 fonctions email (voir section Email) |
| `lib/stripe.ts` | Stripe singleton | `stripe` |
| `lib/audio-storage.ts` | Stockage fichiers audio sur disque | `saveAudioFile, deleteAudioFile, readAudioFile, audioFilePath, audioStreamUrl, ALLOWED_AUDIO_MIMES, MAX_AUDIO_FILE_SIZE` |
| `lib/macro.tsx` | Config couleurs/badges macro exercice | `MACRO_CONFIG, MacroBadge` |
| `lib/swagger.ts` | Spec OpenAPI 3.0 (~2300 lignes) | `swaggerSpec` |
| `lib/hooks/use-data-list.ts` | Hook fetch + loading/error state | `useDataList<T>` |
| `lib/hooks/useFieldErrors.ts` | Hook validation formulaire | `useFieldErrors` |

---

## Tokens JWT

| Token | Fonction sign | Claims | Expiry |
|---|---|---|---|
| User auth | `signUserJwt` | sub (userId), email | 30 jours |
| Praticien confirm | `signPraticienConfirmJwt` | patientUserId, praticienId, type:"praticien-confirmation" | 7 jours |
| Patient setup | `signPatientSetupJwt` | patientUserId, praticienId, type:"patient-setup" | 7 jours |
| Suivi confirm | `signSuiviConfirmJwt` | suiviPatientId, patientUserId, praticienId, type:"suivi-confirmation" | 7 jours |

Secret partagé : `process.env.NEXTAUTH_SECRET`

---

## Emails

| Fonction | Template | Objet |
|---|---|---|
| `sendConfirmationEmail` | `confirmation.html` | Confirmez votre adresse e-mail |
| `sendPasswordResetEmail` | `password-reset.html` | Réinitialisation mot de passe (1h) |
| `sendEmailChangeEmail` | `email-change.html` | Confirmez nouvelle adresse (1h) |
| `sendPraticienConfirmationEmail` | `praticien-confirmation.html` | {praticien} souhaite vous suivre |
| `sendPraticienNotificationEmail` | `praticien-notification.html` | {patient} a confirmé votre demande |
| `sendInvitationEmail` | `invitation.html` | {praticien} vous invite sur MADLEN |
| `sendPatientSetupEmail` | `patient-setup.html` | {praticien} vous a ajouté sur MADLEN |
| `sendListeActivatedEmail` | `liste-activated.html` | Nouvelle liste d'exercices |
| `sendPaymentConfirmationEmail` | `payment-confirmation.html` | Paiement confirmé |
| `sendAdminNewPurchaseEmail` | `admin-new-purchase.html` | Nouvel achat : {product} |

Templates dans `lib/email-templates/` — syntaxe `{{VAR}}`, rendu par `renderTemplate()`.

---

## Patterns de code

### Erreur Prisma (ne PAS importer `Prisma` depuis `@prisma/client`)
```ts
} catch (err) {
  if (err instanceof Error && "code" in err && err.code === "P2002") {
    return Response.json({ error: "Conflit" }, { status: 409 })
  }
  if (err instanceof Error && "code" in err && err.code === "P2025") {
    return Response.json({ error: "Non trouvé" }, { status: 404 })
  }
  return Response.json({ error: "Erreur interne" }, { status: 500 })
}
```

### Validation Zod avec erreurs par champ
```ts
import { zodFieldError } from "@/lib/validate"

const parsed = schema.safeParse(body)
if (!parsed.success) return zodFieldError(parsed.error)
// zodFieldError retourne Response 400 avec { error, fields: Record<string, string> }
```

### normalizeUser (Prisma → format Site)
`normalizeUser(user)` dans `lib/user-jwt.ts` transforme un User Prisma (avec profils) en objet compatible avec le frontend. Toujours utiliser pour les réponses `/api/public/`.

---

## Variables d'environnement

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | oui | Connection string PostgreSQL |
| `NEXTAUTH_SECRET` | oui | Clé JWT (partagée NextAuth + user-jwt.ts) |
| `NEXTAUTH_URL` | oui | URL du dashboard (`https://api.madlen.app`) |
| `APP_URL` | oui | URL du site frontend (`https://madlen.app`) |
| `SMTP_HOST` | oui | Serveur SMTP |
| `SMTP_PORT` | non | Port SMTP (défaut: 587) |
| `SMTP_USERNAME` | oui | Utilisateur SMTP |
| `SMTP_PASSWORD` | oui | Mot de passe SMTP |
| `SMTP_FROM` | non | Adresse expéditeur (défaut: `Madlen <ne-pas-repondre@madlen.app>`) |
| `STRIPE_SECRET_KEY` | oui | Clé API Stripe |
| `STRIPE_WEBHOOK_SECRET` | oui | Secret signature webhook Stripe |
| `STRIPE_PRICE_ID` | oui | ID prix licence par défaut |
| `STRIPE_KIT_PRICE_ID` | non | ID prix kit add-on |

---

## Pages Dashboard

| Path | Description |
|---|---|
| `/dashboard` | Page d'accueil |
| `/dashboard/users` | Liste utilisateurs app |
| `/dashboard/users/nouveau` | Créer utilisateur |
| `/dashboard/users/[id]` | Détail / modifier utilisateur |
| `/dashboard/users/[id]/listes/nouveau` | Créer liste exercices |
| `/dashboard/users/[id]/listes/[listeId]` | Modifier liste exercices |
| `/dashboard/exercices` | Liste exercices |
| `/dashboard/exercices/nouveau` | Créer exercice |
| `/dashboard/exercices/[id]` | Modifier exercice + audios |
| `/dashboard/audio-files` | Gestion fichiers audio |
| `/dashboard/pages` | Liste pages statiques |
| `/dashboard/pages/nouveau` | Créer page (WYSIWYG TipTap) |
| `/dashboard/pages/[id]` | Modifier page |
| `/dashboard/admin-users` | Liste admins |
| `/dashboard/admin-users/nouveau` | Créer admin |
| `/dashboard/admin-users/[id]` | Modifier admin |

Composants dashboard : `app/dashboard/_components/sidebar.tsx`, `wysiwyg-editor.tsx` (TipTap).

---

## Structure du projet

```
/
├── app/
│   ├── layout.tsx, page.tsx (redirect → /dashboard ou /login)
│   ├── login/page.tsx
│   ├── confirm-email/page.tsx
│   ├── api-docs/page.tsx (Swagger UI)
│   ├── dashboard/
│   │   ├── layout.tsx (protégé)
│   │   ├── _components/ (sidebar, wysiwyg-editor)
│   │   ├── users/, exercices/, pages/, admin-users/, audio-files/
│   │   └── [chaque section]/nouveau/ et [id]/
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── swagger/route.ts
│       ├── admin-users/, exercices/, audio-files/, users/, pages/, kit-installations/
│       ├── public/ (login, register, me, profile, exercices, prescriptions, suivi-patients, checkout, stripe, etc.)
│       ├── webhooks/stripe/route.ts
│       └── confirm-email/route.ts
├── lib/
│   ├── prisma.ts, auth.ts, user-jwt.ts, validate.ts, mailer.ts, stripe.ts
│   ├── audio-storage.ts, macro.tsx, swagger.ts
│   ├── email-templates/ (10 templates HTML)
│   └── hooks/ (use-data-list.ts, useFieldErrors.ts)
├── prisma/
│   ├── schema.prisma
│   └── migrations/ (17 migrations)
├── scripts/ (seed-user.mjs, import-exercices.mjs, db-baseline.sh, backup/restore)
├── storage/audio/ (fichiers audio uploadés, gitignored)
├── middleware.ts (protège /dashboard/*, /api-docs, /api/swagger)
├── auth.config.ts (config Edge-safe)
├── prisma.config.ts (datasource URL uniquement)
└── .env (jamais commité)
```

---

## Stripe

- `lib/stripe.ts` : client singleton
- `/api/public/checkout` POST : crée session Checkout (licence + kit optionnel)
- `/api/public/stripe/products` GET : liste produits (filtrés par user_type)
- `/api/webhooks/stripe` POST : traite `checkout.session.completed` (active licence, marque kitPurchasedAt, envoie emails) et `charge.refunded` (reset licence + kit)
- `/api/kit-installations` POST : sync unifiée — parcourt toutes les sessions Stripe, vérifie remboursements, met à jour licence ET kit en une passe
- Produits Stripe : metadata `type` = `"license"` ou `"kit"`, `license_days` (défaut 365), `user_type`

---

## Audio

- Stockage disque : `storage/audio/{id}.{ext}`
- Max : 20 MB par fichier
- MIME autorisés : mpeg, wav, wave, x-wav, ogg, webm, aac, mp4, flac, x-m4a, x-flac
- URL stream : `/api/audio-files/{id}/stream`
- Auto-détection exercice depuis pattern filename `exercice-{numero}`

---

## Scripts npm

| Commande | Usage |
|---|---|
| `npm run dev` | Serveur dev (port 3001) |
| `npm run build` | Build production |
| `npm start` | Serveur prod (port 3001) |
| `npm run db:generate` | Régénère client Prisma |
| `npm run db:migrate` | Crée + applique migration (local, interactif) |
| `npm run db:deploy` | Applique migrations prod (avec backup auto) |
| `npm run db:deploy:skip-backup` | Deploy sans backup |
| `npm run db:backup` | Backup manuel |
| `npm run db:restore` | Restauration depuis dump |
| `npm run db:studio` | Prisma Studio (port 5555) |
| `npm run db:baseline` | Baseline sécurisé 0_init |
| `npm run db:import-exercices` | Import exercices depuis .ini legacy |

---

## Règles Prisma 7

- Pas de `url` dans `datasource db` du schema.prisma — connexion dans `prisma.config.ts`
- Import depuis `@/lib/prisma` uniquement
- Pas de raw SQL
- Erreurs : `err instanceof Error && "code" in err && err.code === "P2002"` (pas d'import `Prisma`)

---

## Skills disponibles

Des skills Claude Code sont configurés pour automatiser les tâches récurrentes :

| Skill | Usage |
|---|---|
| `/api-route` | Génère route API complète (admin ou public) + optionnel proxy BFF |
| `/api-sync` | Compare endpoints publics avec proxies BFF du Site |
| `/prisma-feature` | Workflow complet : schema → migration → generate → swagger → types |
| `/swagger-update` | Met à jour `lib/swagger.ts` en scannant les routes |
| `/dashboard-page` | Génère pages dashboard CRUD |
| `/email-template` | Crée template email + fonction mailer |
| `/deploy` | Déploie sur VPS (git pull, install, prisma, build, PM2) |
| `/devlog` | Publie devlog dans Notion |

---

## Sécurité

- Secrets uniquement dans `.env` (gitignored)
- Tous les inputs validés avec Zod avant toute query DB
- Routes `/dashboard/*` protégées par middleware
- Routes admin vérifient `auth()`, routes publiques vérifient `verifyUserJwt()`
- Passwords hashés bcryptjs (12 rounds)
- Pas de stack traces ni détails internes dans les réponses client
- Codes HTTP standard : 200, 201, 400, 401, 404, 409, 410, 500

---

## Repo Madlen-Site

- **Local** : `../Madlen-Site`
- **Production** : `https://madlen.app`
- **Env var côté Site** : `MADLEN_API_URL` → `https://api.madlen.app`
- **Types partagés** : User → `types/user.ts`, Patient/Praticien → `types/profile.ts`, Exercice → `types/exercice.ts`, Prescription → `types/prescription.ts`, SuiviPatient → `types/patients.ts`
