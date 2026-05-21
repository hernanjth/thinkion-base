import { prisma } from "@/lib/prisma";
import { sha256, type ApiScope } from "@/lib/api-auth";

// ─── Token authentication for MCP route ──────────────────────────────────────

export type McpAuthResult =
  | { ok: true;  userId: string; userRole: string; scopes: string[] }
  | { ok: false; hasToken: boolean };

/**
 * Validates the Bearer token from an MCP request.
 * Updates last_used_at on success.
 */
export async function authenticateMcpRequest(
  request: Request
): Promise<McpAuthResult> {
  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return { ok: false, hasToken: false };
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
    },
  });

  if (!token || token.revoked_at) return { ok: false, hasToken: true };
  if (token.expires_at && token.expires_at < new Date()) {
    return { ok: false, hasToken: true };
  }

  // Fetch user role
  const user = await prisma.user.findUnique({
    where:  { id: token.created_by },
    select: { role: true },
  });

  if (!user) return { ok: false, hasToken: true };

  // Update last_used_at (fire-and-forget)
  prisma.apiToken
    .update({ where: { id: token.id }, data: { last_used_at: new Date() } })
    .catch(() => {});

  return {
    ok:       true,
    userId:   token.created_by,
    userRole: user.role,
    scopes:   token.scopes,
  };
}

/** Check if the authenticated result has a required scope. */
export function requireScope(auth: McpAuthResult, scope: ApiScope): boolean {
  return auth.ok && auth.scopes.includes(scope);
}
