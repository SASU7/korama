/**
 * An error that names the HTTP status the caller should see.
 *
 * Only a fault the caller can fix gets one of these. Anything thrown as a
 * plain Error is treated as our own fault — apiError answers 500 and masks the
 * message — so a missing key or a failed query can never be reported as a 400
 * that blames the client. Messages on a 4xx are written for the person on the
 * other end and are returned verbatim, in production too.
 *
 * No server-only imports here: lib/domain.ts throws these and is bundled for
 * the browser as well.
 */
export class HttpError extends Error {
  // A plain field, not a parameter property: node --test strips types rather
  // than compiling them, and parameter properties need a real compiler.
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

/** The request itself is malformed or fails validation. */
export function badRequest(message: string) {
  return new HttpError(400, message);
}
/** The addressed order, shipment or catalogue row does not exist in scope. */
export function notFound(message: string) {
  return new HttpError(404, message);
}
/** The request is well formed but the current state refuses it. */
export function conflict(message: string) {
  return new HttpError(409, message);
}
export function payloadTooLarge(message: string) {
  return new HttpError(413, message);
}
/** Paystack (or another provider) failed or answered unusably. */
export function upstreamFailure(message: string) {
  return new HttpError(502, message);
}
