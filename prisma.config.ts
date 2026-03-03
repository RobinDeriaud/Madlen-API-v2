import { defineConfig } from "prisma/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

try { process.loadEnvFile() } catch {}

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL!,
  },
  // the `migrate` property was removed in Prisma v7.4+; migrations
  // configuration is now handled separately and we don’t need an
  // adapter here. Keeping a minimal config avoids build errors
  // during Next.js compilation on the VPS.
})
