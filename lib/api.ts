import { randomUUID } from "node:crypto";

export async function jsonBody(request: Request) {
  const raw = await request.text();
  if (raw.length > 64 * 1024) throw new Error("Request body is too large");
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Request body must be a JSON object");
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof Error && error.message === "Request body must be a JSON object") throw error;
    throw new Error("Request body must be valid JSON");
  }
}
export function validatedBusinessReference(value: unknown, fallback = "") {
  const reference = typeof value === "string" ? value.trim() : fallback;
  if (!reference || reference.length > 128 || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(reference)) throw new Error("Invalid business reference");
  return reference;
}
export function validatedEmail(value: unknown, fallback: string) {
  const email = typeof value === "string" && value.trim() ? value.trim() : fallback;
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("A valid email address is required");
  return email;
}
export function apiError(error: unknown, request?: Request) {
  const suppliedRequestId = request?.headers.get("x-request-id")?.trim() || "";
  const requestId = /^[A-Za-z0-9._:-]{1,128}$/.test(suppliedRequestId) ? suppliedRequestId : randomUUID();
  const detail = error instanceof Error ? error.message : "Unexpected request error";
  const production = process.env.NODE_ENV === "production";
  const message = production
    ? "The request could not be completed"
    : detail;
  console.error(JSON.stringify({ event: "api_error", requestId, method: request?.method, path: request ? new URL(request.url).pathname : undefined, message: production ? "request_failed" : detail }));
  return Response.json({ error: message, requestId }, { status: 400, headers: { "x-request-id": requestId, "cache-control": "no-store" } });
}
