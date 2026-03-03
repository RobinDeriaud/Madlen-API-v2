import { readFileSync } from "fs"
import { resolve } from "path"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import bcrypt from "bcryptjs"

// Load .env manually (imports are hoisted, la connexion est créée après)
const envPath = resolve(process.cwd(), ".env")
const envContent = readFileSync(envPath, "utf-8")
for (const line of envContent.split("\n")) {
  const [key, ...rest] = line.split("=")
  if (key && rest.length) process.env[key.trim()] = rest.join("=").trim()
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const email = "robin@madlen.app"
const password = "Madlen2026"
const role = "admin"

const passwordHash = await bcrypt.hash(password, 10)

try {
  const user = await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash, role },
    create: { email, passwordHash, role },
  })
  console.log(`✓ User upserted: ${user.email} (role: ${user.role})`)
} catch (err) {
  console.error("Error:", err.message)
} finally {
  await prisma.$disconnect()
}
