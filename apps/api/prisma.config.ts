import type { PrismaConfig } from "prisma";
import { env } from "prisma/config";
import path from "node:path";

process.loadEnvFile(path.resolve(__dirname, ".env"));

export default {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx src/db/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
} satisfies PrismaConfig;