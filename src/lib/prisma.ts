import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// ── Diagnostic log: verify DATABASE_URL params on startup (redacts password) ──
if (typeof process.env.DATABASE_URL === "string") {
  try {
    const u = new URL(process.env.DATABASE_URL);
    const safe = `${u.protocol}//${u.username}:***@${u.host}${u.pathname}${u.search}`;
    console.log(`[prisma] DATABASE_URL: ${safe}`);
  } catch {
    console.log("[prisma] DATABASE_URL: unparseable");
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
