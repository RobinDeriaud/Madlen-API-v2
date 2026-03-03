import { defineConfig } from "prisma/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

try { process.loadEnvFile() } catch {}

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL!,
  },
  migrate: {
    async adapter() {
      const pool = new Pool({ connectionString: process.env.DATABASE_URL })
      return new PrismaPg(pool)
    },
  },
})
