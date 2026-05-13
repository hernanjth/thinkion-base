import { createHmac } from "crypto";
import { prisma } from "./prisma";

/**
 * Verify a webhook signature using HMAC-SHA256.
 *
 * @param rawBody - The raw request body as a Buffer or string
 * @param signature - The signature header value (hex digest from sender)
 * @param secret - The shared webhook secret
 * @returns true if signature is valid, false otherwise
 *
 * @example
 *   // In a route handler:
 *   const rawBody = await req.arrayBuffer();
 *   const signature = req.headers.get("x-webhook-signature") ?? "";
 *   const valid = verifyHmacSignature(Buffer.from(rawBody), signature, process.env.MY_WEBHOOK_SECRET!);
 *   if (!valid) return new Response("Unauthorized", { status: 401 });
 */
export function verifyHmacSignature(
  rawBody: Buffer | string,
  signature: string,
  secret: string
): boolean {
  const expected = createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  return expected === signature;
}

/**
 * Log an incoming webhook to the webhook_logs table.
 * Failures are silently ignored to avoid breaking the webhook handler.
 *
 * @param source - Identifier for the webhook source (e.g. "safety-culture", "hubspot")
 * @param payload - The parsed JSON payload
 * @param processed - Whether the webhook was processed successfully
 * @param error - Optional error message if processing failed
 */
export async function logWebhook(
  source: string,
  payload: unknown,
  processed: boolean,
  error?: string
): Promise<void> {
  try {
    await prisma.webhookLog.create({
      data: {
        source,
        raw_payload: payload as object,
        processed,
        error: error ?? null,
      },
    });
  } catch {
    // Logging failures must never break the webhook handler
  }
}
