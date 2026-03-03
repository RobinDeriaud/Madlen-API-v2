# Project Configuration for Claude Code

## Project Overview
Dashboard d'administration privé avec authentification, construit avec Next.js et PostgreSQL.
**Remplacement de Strapi** : la structure de la DB est inspirée de l'ancien projet Strapi mais entièrement gérée par Prisma.

---

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL (already running on the VPS)
- **DB Client:** Prisma 7 (ORM avec driver adapter `@prisma/adapter-pg` + `pg`)
- **Auth:** NextAuth.js v5 (credentials provider — email/password)
- **Validation:** `zod` (all user inputs must be validated before any DB query)
- **Styling:** Tailwind CSS

---

## Project Structure

```
/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                        # Redirects to /dashboard or /login
│   ├── login/
│   │   └── page.tsx                    # Login form
│   ├── dashboard/
│   │   ├── layout.tsx                  # Protected layout (checks session)
│   │   └── page.tsx                    # Main dashboard page
│   └── api/
│       ├── auth/
│       │   └── [...nextauth]/
│       │       └── route.ts            # NextAuth handler
│       └── users/
│           └── route.ts                # Example: GET /api/users, POST /api/users
├── lib/
│   ├── db.ts                           # Legacy postgres.js client (kept for reference)
│   ├── prisma.ts                       # Prisma 7 singleton client (use this)
│   ├── auth.ts                         # NextAuth config (exported for middleware)
│   └── validate.ts                     # Zod schemas for input validation
├── prisma/
│   ├── schema.prisma                   # Database schema (models)
│   ├── migrations/                     # Migration history (committed to git)
│   └── migration_lock.toml
├── prisma.config.ts                    # Prisma 7 config (driver adapter + migrate)
├── middleware.ts                        # Protects /dashboard routes
└── .env                                # Environment variables (never committed)
```

---

## Environment Variables

Create `.env` with these keys (do NOT commit this file):

```
DATABASE_URL=postgresql://monapp:mot_de_passe@localhost:5432/mabase
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
NEXTAUTH_URL=https://yourdomain.com
```

---

## Database Rules

- Use Prisma for all DB access. Import from `@/lib/prisma.ts`.
- All queries go through the Prisma client — no raw SQL string concatenation.
- Schema is defined in `prisma/schema.prisma`. Migrations are in `prisma/migrations/`.
- Never expose raw DB errors to the client. Catch errors server-side and return generic messages.
- Check Prisma error codes (e.g. `P2002` = unique constraint) instead of PostgreSQL error codes.

Example pattern:
```ts
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

try {
  const user = await prisma.user.findUnique({ where: { email } })
} catch (err) {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    return Response.json({ error: "Email already exists" }, { status: 409 })
  }
  return Response.json({ error: "Internal server error" }, { status: 500 })
}
```

---

## Authentication Rules

- Use NextAuth.js v5 with the **Credentials provider** (email + bcrypt password).
- Password hashing: use `bcryptjs`.
- The NextAuth config must be in `lib/auth.ts` and exported as `{ handlers, auth, signIn, signOut }`.
- Session strategy: `jwt`.
- `middleware.ts` must protect all `/dashboard/*` routes — redirect unauthenticated users to `/login`.

Example middleware:
```ts
export { auth as middleware } from "@/lib/auth"

export const config = {
  matcher: ["/dashboard/:path*"],
}
```

---

## API Routes Rules

- All API routes are in `app/api/`.
- Every route that writes to the DB must:
  1. Check the session with `auth()` — reject if unauthenticated (return 401).
  2. Validate the request body with a Zod schema before touching the DB.
  3. Return JSON responses only.
- Use standard HTTP status codes (200, 201, 400, 401, 404, 500).
- Never return stack traces or internal error details to the client.

Example pattern for a protected POST route:
```ts
import { auth } from "@/lib/auth"
import { z } from "zod"
import sql from "@/lib/db"

const schema = z.object({ name: z.string().min(1) })

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return Response.json({ error: "Invalid input" }, { status: 400 })

  await sql`INSERT INTO items (name) VALUES (${parsed.data.name})`
  return Response.json({ ok: true }, { status: 201 })
}
```

---

## Security Checklist (apply to everything generated)

- [ ] No secrets in source code — only in `.env`
- [ ] All user inputs validated with Zod before any DB query
- [ ] All `/dashboard` routes protected by middleware
- [ ] All write API routes check session before executing
- [ ] Passwords hashed with bcryptjs (never stored plain)
- [ ] No raw SQL string concatenation — always tagged template literals
- [ ] `.env` listed in `.gitignore`
- [ ] Generic error messages returned to client (no stack traces)

---

## Prisma Workflow (local Docker ↔ VPS)

### Architecture DB
- **Local** : PostgreSQL via Docker (DB vide, recréée par Prisma)
- **VPS** : PostgreSQL direct, nouvelle DB dédiée à ce projet (séparée de l'ancienne DB Strapi)
- Prisma est le seul gestionnaire du schéma — pas de Strapi, pas de SQL manuel

### Règle Prisma 7 : pas de `url` dans schema.prisma
Le `datasource db` ne doit PAS avoir de champ `url`. La connexion est dans `prisma.config.ts` uniquement.

### Développement local (Docker)
```bash
# Modifier prisma/schema.prisma, puis :
npm run db:migrate
# → Entre un nom de migration (ex: "add_champ_foo")
# → Crée prisma/migrations/YYYYMMDD_nom/migration.sql
# → Applique sur la DB Docker locale
# → Régénère le client TypeScript automatiquement
```

### Premier déploiement sur le VPS (DB vide)
```bash
# Sur le VPS, après git pull + npm install :
npm run db:deploy     # Applique toutes les migrations (crée toutes les tables)
npm run db:generate   # Génère le client TypeScript
node scripts/seed-user.mjs  # Crée le premier admin
```

### Mises à jour suivantes sur le VPS
```bash
# Sur le VPS, après git pull :
npm run db:deploy   # Applique uniquement les nouvelles migrations
```

### Voir et éditer les données visuellement
```bash
npm run db:studio
# → Ouvre Prisma Studio sur http://localhost:5555
```

### Résumé des scripts
| Commande | Usage |
|---|---|
| `npm run db:generate` | Regénère le client TypeScript après changement de schéma |
| `npm run db:migrate` | Crée + applique une migration (local uniquement) |
| `npm run db:deploy` | Applique les migrations en production (VPS, sans prompt) |
| `npm run db:studio` | Interface visuelle pour parcourir/modifier les données |
| `npm run db:baseline` | Marque une migration comme déjà appliquée (cas exceptionnel) |

---

## Initial Setup Commands

```bash
# 1. Install dependencies
npm install

# 2. Generate NEXTAUTH_SECRET
openssl rand -base64 32

# 3. Remplir .env avec DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL

# 4. Setup Prisma local (Docker)
npm run db:migrate    # Applique 0_init → crée toutes les tables
npm run db:generate   # Génère le client

# 5. Créer le premier admin
node scripts/seed-user.mjs

# 6. Start dev server
npm run dev
```

---

## Modèles Prisma — Structure de la DB

Deux familles de tables dans `prisma/schema.prisma` :

### Auth admin (table `users`)
- `AdminUser` — administrateurs du dashboard (email + bcrypt password + role)
- Utilisé par NextAuth via `prisma.adminUser`

### Données métier (ex-Strapi)
- `User` → table `up_users` — utilisateurs de l'app (patients/praticiens)
- `Patient` → table `patients`
- `Praticien` → table `praticiens`
- `Exercice` → table `exercices`
- `SuiviPatient` → table `suivi_patients`
- `Prescription` → table `prescriptions`
- `PageStatique` → table `page_statiques`
- Composants : `ExerciceElement`, `ListeElement`, `ParcoursElement`, `Parcours`

### Erreurs Prisma dans les catch
Ne pas importer `Prisma` depuis `@prisma/client`. Utiliser :
```ts
} catch (err) {
  if (err instanceof Error && "code" in err && err.code === "P2002") { ... }
}
```
