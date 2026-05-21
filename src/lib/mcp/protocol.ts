// ─── JSON-RPC 2.0 types for MCP ───────────────────────────────────────────────

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id:      string | number | null;
  method:  string;
  params?: unknown;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id:      string | number | null;
  result?: unknown;
  error?:  { code: number; message: string; data?: unknown };
}

export function rpcOk(id: string | number | null, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

export function rpcError(
  id:      string | number | null,
  code:    number,
  message: string,
  data?:   unknown
): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message, ...(data ? { data } : {}) } };
}

// Standard JSON-RPC error codes
export const RPC_PARSE_ERROR     = -32700;
export const RPC_INVALID_REQUEST = -32600;
export const RPC_METHOD_NOT_FOUND = -32601;
export const RPC_INVALID_PARAMS  = -32602;
export const RPC_INTERNAL_ERROR  = -32603;
