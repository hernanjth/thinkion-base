import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";

// ── Raw DB helpers (no cache) ─────────────────────────────────────────────────

export async function getSetting(key: string, fallback = ""): Promise<string> {
  const s = await prisma.setting.findUnique({ where: { key } });
  return s?.value ?? fallback;
}

export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return map;
}

export async function upsertSetting(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

// ── Cached helpers ────────────────────────────────────────────────────────────
// Cached across requests with a 5-minute TTL.
// Call revalidateTag("settings") after any upsertSetting to bust the cache.

export const getCachedSettings = unstable_cache(
  async (keys: string[]) => getSettings(keys),
  ["settings"],
  { revalidate: 300, tags: ["settings"] },
);

export const getCachedSetting = unstable_cache(
  async (key: string, fallback = "") => getSetting(key, fallback),
  ["settings"],
  { revalidate: 300, tags: ["settings"] },
);
