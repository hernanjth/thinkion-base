import { prisma } from "@/lib/prisma";
import { rpcOk, rpcError, RPC_INVALID_PARAMS, type JsonRpcResponse } from "@/lib/mcp/protocol";

// ─── ping tool ────────────────────────────────────────────────────────────────
// Scope required: data:read
// Returns server health + caller identity.
// TODO: replace or extend with your app's actual tools.

export async function handlePing(
  id:     string | number | null,
  userId: string,
  _params: unknown
): Promise<JsonRpcResponse> {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { id: true, name: true, role: true },
  });

  if (!user) return rpcError(id, RPC_INVALID_PARAMS, "User not found");

  return rpcOk(id, {
    pong:      true,
    timestamp: new Date().toISOString(),
    user_id:   user.id,
    user_name: user.name,
    user_role: user.role,
  });
}
