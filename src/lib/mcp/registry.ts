import { rpcError, rpcOk, RPC_METHOD_NOT_FOUND, type JsonRpcRequest, type JsonRpcResponse } from "@/lib/mcp/protocol";
import { handlePing } from "@/lib/mcp/tools/example";
import type { McpAuthResult } from "@/lib/mcp/auth";

// ─── Tool manifest (returned by tools/list) ───────────────────────────────────

export const TOOL_MANIFEST = [
  {
    name:        "ping",
    description: "Health check — returns server status and caller identity.",
    inputSchema: {
      type:       "object",
      properties: {},
      required:   [],
    },
  },
  // TODO: add your app's tools here
];

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export async function dispatchMcpMethod(
  req:    JsonRpcRequest,
  auth:   McpAuthResult & { ok: true },
): Promise<JsonRpcResponse> {
  const { id, method, params } = req;

  // ── Standard MCP lifecycle methods ──────────────────────────────────────────
  if (method === "initialize") {
    return rpcOk(id, {
      protocolVersion: "2024-11-05",
      serverInfo:      { name: "thinkion-base-mcp", version: "1.0.0" },
      capabilities:    { tools: {} },
    });
  }

  if (method === "notifications/initialized") {
    return rpcOk(id, {});
  }

  if (method === "tools/list") {
    return rpcOk(id, { tools: TOOL_MANIFEST });
  }

  // ── Tool calls ───────────────────────────────────────────────────────────────
  if (method === "tools/call") {
    const p    = params as { name?: string; arguments?: unknown } | undefined;
    const name = p?.name;
    const args = p?.arguments ?? {};

    if (name === "ping") {
      if (!auth.scopes.includes("data:read")) {
        return rpcError(id, -32001, "Insufficient scope — requires data:read");
      }
      return handlePing(id, auth.userId, args);
    }

    // TODO: add more tool cases here

    return rpcError(id, RPC_METHOD_NOT_FOUND, `Unknown tool: ${name}`);
  }

  return rpcError(id, RPC_METHOD_NOT_FOUND, `Unknown method: ${method}`);
}
