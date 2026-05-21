import { NextResponse } from "next/server";
import { authenticateMcpRequest } from "@/lib/mcp/auth";
import { dispatchMcpMethod }       from "@/lib/mcp/registry";
import { rpcError, RPC_PARSE_ERROR, RPC_INVALID_REQUEST, type JsonRpcRequest } from "@/lib/mcp/protocol";

export const maxDuration = 60;

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function wwwAuthenticate(hasToken: boolean): string {
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "thinkion-app";
  const base = `Bearer realm="${appName}", resource_metadata="${BASE_URL}/.well-known/oauth-protected-resource"`;
  return hasToken ? `${base}, error="invalid_token"` : base;
}

// ─── GET — discovery / health ─────────────────────────────────────────────────

export async function GET(request: Request) {
  const auth = await authenticateMcpRequest(request);

  if (!auth.ok) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status:  401,
      headers: {
        "Content-Type":    "application/json",
        "WWW-Authenticate": wwwAuthenticate(auth.hasToken),
      },
    });
  }

  return NextResponse.json({
    name:            process.env.NEXT_PUBLIC_APP_NAME ?? "Thinkion App",
    version:         "1.0.0",
    protocol:        "MCP/1.0",
    transport:       "streamable-http",
    authenticated_as: auth.userId,
  });
}

// ─── POST — JSON-RPC 2.0 dispatch ─────────────────────────────────────────────

export async function POST(request: Request) {
  const auth = await authenticateMcpRequest(request);

  if (!auth.ok) {
    return new Response(
      JSON.stringify(rpcError(null, -32001, "Unauthorized")),
      {
        status:  401,
        headers: {
          "Content-Type":    "application/json",
          "WWW-Authenticate": wwwAuthenticate(auth.hasToken),
        },
      }
    );
  }

  let body: JsonRpcRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(rpcError(null, RPC_PARSE_ERROR, "Parse error"), { status: 400 });
  }

  if (body.jsonrpc !== "2.0" || !body.method) {
    return NextResponse.json(rpcError(body.id ?? null, RPC_INVALID_REQUEST, "Invalid JSON-RPC request"), { status: 400 });
  }

  const result = await dispatchMcpMethod(body, auth);
  return NextResponse.json(result);
}
