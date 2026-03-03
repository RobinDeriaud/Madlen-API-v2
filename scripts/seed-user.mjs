import { readFileSync } from "fs"
import { resolve } from "path"

// Load .env.local manually
const envPath = resolve(process.cwd(), ".env.local")
const envContent = readFileSync(envPath, "utf-8")
for (const line of envContent.split("\n")) {
  const [key, ...rest] = line.split("=")
  if (key && rest.length) process.env[key.trim()] = rest.join("=").trim()
}

import postgres from "postgres"
import bcrypt from "bcryptjs"

const sql = postgres(process.env.DATABASE_URL, { ssl: false })

const email = "robin@madlen.com"
const password = "Madlen2026"
const role = "admin"

const hash = await bcrypt.hash(password, 10)

try {
  await sql`
    INSERT INTO users (email, password_hash, role)
    VALUES (${email}, ${hash}, ${role})
    ON CONFLICT (email) DO UPDATE
      SET password_hash = ${hash},
          role = ${role}
  `
  console.log(`✓ User created: ${email} (role: ${role})`)
} catch (err) {
  console.error("Error:", err.message)
} finally {
  await sql.end()
}
