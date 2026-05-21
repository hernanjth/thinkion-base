import crypto from "crypto";
import { prisma } from "@/lib/prisma";

// ─── Scopes ──────────────────────────────────────────────────────────────────
// TODO: replace with your app's scopes

export const API_SCOPES = [
  "data:read",
  "data:write",
  "admin:read",
  "admin:write",
] as const;

export type ApiScope = (typeof API_SCOPES)[number];

/** Scopes allowed per role. Adjust to your app's permission model. */
export function scopesForRole(role: string, requested?: string[]): ApiScope[] {
  let allowed: ApiScope[];
  switch (role) {
    case "ADMIN":
      allowed = [...API_SCOPES];
      break;
    case "SUPERVISOR":
      allowed = ["data:read", "data:write", "admin:read"];
      break;
    default:
      allowed = ["data:read"];
  }
  if (!requested || requested.length === 0) return allowed;
  return allowed.filter((s) => requested.includes(s));
}

// ─── Token generation ─────────────────────────────────────────────────────────

export async function sha256(value: string): Promise<string> {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/** Generates a bearer API token: `cthk_<uuid>` (26-char prefix). */
export async function generateApiToken(): Promise<{
  raw: string;
  hash: string;
  prefix: string;
}> {
  const raw    = `cthk_${crypto.randomUUID()}`;
  const hash   = await sha256(raw);
  const prefix = raw.slice(0, 8);
  return { raw, hash, prefix };
}

/** Generates an OAuth refresh token: `crtk_<uuid>`. */
export async function generateRefreshToken(): Promise<{
  raw: string;
  hash: string;
  prefix: string;
}> {
  const raw    = `crtk_${crypto.randomUUID()}`;
  const hash   = await sha256(raw);
  const prefix = raw.slice(0, 12);
  return { raw, hash, prefix };
}

// ─── Authentication ────────────────────────────────────────────────────────────

export type AuthResult =
  | { ok: true; tokenId: string; userId: string; scopes: string[] }
  | { ok: false; error: string; status: number };

/**
 * Authenticates an incoming API request via Bearer token.
 * Updates `last_used_at` on success.
 */
export async function authenticateApiRequest(
  request: Request
): Promise<AuthResult> {
  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return { ok: false, error: "Missing Bearer token", status: 401 };
  }

  const raw  = authHeader.slice(7).trim();
  const hash = await sha256(raw);

  const token = await prisma.apiToken.findUnique({
    where: { key_hash: hash },
    select: {
      id:         true,
      scopes:     true,
      revoked_at: true,
      expires_at: true,
      created_by: true,
      // OAuth tokens have refresh_token_hash set — the access token itself is still valid
    },
  });

  if (!token) return { ok: false, error: "Invalid token", status: 401 };
  if (token.revoked_at) return { ok: false, error: "Token revoked", status: 401 };
  if (token.expires_at && token.expires_at < new Date()) {
    return { ok: false, error: "Token expired", status: 401 };
  }

  // Fire-and-forget last_used_at update
  prisma.apiToken
    .update({ where: { id: token.id }, data: { last_used_at: new Date() } })
    .catch(() => {});

  return {
    ok:      true,
    tokenId: token.id,
    userId:  token.created_by,
    scopes:  token.scopes,
  };
}

// ─── Response helpers ─────────────────────────────────────────────────────────

export function apiOk<T>(data: T, meta?: Record<string, unknown>): Response {
  return Response.json({ data, ...(meta ?? {}) });
}

export function apiError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

export function parsePagination(url: URL): { page: number; limit: number; skip: number } {
  const page  = Math.max(1, parseInt(url.searchParams.get("page")  ?? "1",  10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10)));
  return { page, limit, skip: (page - 1) * limit };
}
