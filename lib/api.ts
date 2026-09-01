import { randomUUID } from "node:crypto";
import { HttpError, badRequest, payloadTooLarge } from "@/lib/errors";

export async function jsonBody(request: Request) {
  const raw = await request.text();
  if (raw.length > 64 * 1024) throw payloadTooLarge("Request body is too large");
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw badRequest("Request body must be a JSON object");
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw badRequest("Request body must be valid JSON");
  }
}
export function validatedBusinessReference(value: unknown, fallback = "") {
  const reference = typeof value === "string" ? value.trim() : fallback;
  if (!reference || reference.length > 128 || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(reference)) throw badRequest("Invalid business reference");
  return reference;
}
export function validatedEmail(value: unknown, fallback: string) {
  const email = typeof value === "string" && value.trim() ? value.trim() : fallback;
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw badRequest("A valid email address is required");
  return email;
}
export function apiError(error: unknown, request?: Request) {
  const suppliedRequestId = request?.headers.get("x-request-id")?.trim() || "";
  const requestId = /^[A-Za-z0-9._:-]{1,128}$/.test(suppliedRequestId) ? suppliedRequestId : randomUUID();
  const detail = error instanceof Error ? error.message : "Unexpected request error";
  // An unclassified throw is our fault, not the caller's: 500, not 400.
  const status = error instanceof HttpError ? error.status : 500;
  const production = process.env.NODE_ENV === "production";
  // A 4xx message is authored for the caller, so it is returned as written —
  // "Enter the delivery city" is the point of the response. A 5xx message can
  // carry internals, so production sees one generic sentence instead.
  const message = status < 500 || !production ? detail : "The request could not be completed";
  // The response is masked; the log never is. Swallowing the detail here left
  // a bare 400 with no recoverable cause anywhere.
  console.error(JSON.stringify({ event: "api_error", requestId, method: request?.method, path: request ? new URL(request.url).pathname : undefined, status, message: detail, stack: error instanceof Error ? error.stack : undefined }));
  return Response.json({ error: message, requestId }, { status, headers: { "x-request-id": requestId, "cache-control": "no-store" } });
}
