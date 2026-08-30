import { randomUUID } from "node:crypto";

export async function jsonBody(request: Request) {
  try { return await request.json() as Record<string, unknown>; } catch { throw new Error("Request body must be valid JSON"); }
}
export function apiError(error: unknown, request?: Request) {
  const requestId = request?.headers.get("x-request-id") || randomUUID();
  const message = error instanceof Error ? error.message : "Unexpected demo error";
  console.error(JSON.stringify({ event: "api_error", requestId, method: request?.method, path: request ? new URL(request.url).pathname : undefined, message }));
  return Response.json({ error: message, requestId }, { status: 400, headers: { "x-request-id": requestId } });
}
