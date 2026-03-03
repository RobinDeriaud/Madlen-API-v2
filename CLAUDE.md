# Project Configuration for Claude Code

## Project Overview
Private admin dashboard with user authentication, built with Next.js and PostgreSQL.
No existing codebase — this is a fresh project.

---

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL (already running on the VPS)
- **DB Client:** `postgres.js` (NOT Prisma — direct SQL with automatic escaping)
- **Auth:** NextAuth.js v5 (credentials provider — email/password)
- **Validation:** `zod` (all user inputs must be validated before any DB query)
- **Styling:** Tailwind CSS

---

## Project Structure to Create

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
│   ├── db.ts                           # PostgreSQL connection via postgres.js
│   ├── auth.ts                         # NextAuth config (exported for middleware)
│   └── validate.ts                     # Zod schemas for input validation
├── middleware.ts                        # Protects /dashboard routes
├── .env.local                          # Environment variables (see below)
└── sql/
    └── init.sql                        # SQL file to manually initialize the DB schema
```

---

## Environment Variables

Create `.env.local` with these keys (do NOT commit this file):

```
DATABASE_URL=postgresql://monapp:mot_de_passe@localhost:5432/mabase
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
NEXTAUTH_URL=https://yourdomain.com
```

---

## Database Rules

- Use `postgres.js` for all DB access. Import from `@/lib/db.ts`.
- Always use tagged template literals for queries — never string concatenation:
  ```ts
  // CORRECT
  const result = await sql`SELECT * FROM users WHERE email = ${email}`

  // NEVER DO THIS
  const result = await sql.unsafe(`SELECT * FROM users WHERE email = '${email}'`)
  ```
- Never expose raw DB errors to the client. Catch errors server-side and return generic messages.
- The `sql/init.sql` file must contain all CREATE TABLE statements needed to set up the schema from scratch.

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

- [ ] No secrets in source code — only in `.env.local`
- [ ] All user inputs validated with Zod before any DB query
- [ ] All `/dashboard` routes protected by middleware
- [ ] All write API routes check session before executing
- [ ] Passwords hashed with bcryptjs (never stored plain)
- [ ] No raw SQL string concatenation — always tagged template literals
- [ ] `.env.local` listed in `.gitignore`
- [ ] Generic error messages returned to client (no stack traces)

---

## Initial Setup Commands

After generating the project, run in order:

```bash
# 1. Install dependencies
npm install postgres next-auth@beta bcryptjs zod
npm install -D @types/bcryptjs

# 2. Set up the database (run once on the VPS)
psql -U monapp -d mabase -f sql/init.sql

# 3. Generate NEXTAUTH_SECRET
openssl rand -base64 32

# 4. Start dev server
npm run dev
```

---

## What to Generate First

In this order:
1. `lib/db.ts` — DB connection
2. `sql/init.sql` — users table (id, email, password_hash, role, created_at)
3. `lib/auth.ts` — NextAuth config with credentials provider
4. `middleware.ts` — route protection
5. `app/login/page.tsx` — login form
6. `app/dashboard/page.tsx` — basic protected dashboard
7. `app/api/users/route.ts` — example CRUD route
