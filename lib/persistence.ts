import "server-only";

import { createSupabaseAdminClient } from "@/lib/auth";
import { badRequest, conflict } from "@/lib/errors";

/** Audit events belong to the pilot company: Ghana, while Nigeria is parked. */
const PILOT_OPERATING_COMPANY_ID = "10000000-0000-0000-0000-000000000001";

function normalizeIdempotencyKey(value: string | null) {
  const key = value?.trim() ?? "";
  if (key.length > 200)
    throw badRequest("Idempotency-Key must be 200 characters or fewer");
  return key;
}

export async function getIdempotentResponse(
  value: string | null,
  operation: string,
) {
  const key = normalizeIdempotencyKey(value);
  if (!key) return null;
  const { data, error } = await createSupabaseAdminClient()
    .from("idempotency_keys")
    .select("operation,response")
    .eq("key", key)
    .maybeSingle();
  if (error) throw new Error(`Idempotency read failed: ${error.message}`);
  if (!data) return null;
  if (data.operation !== operation)
    throw conflict("Idempotency-Key was already used for another operation");
  const response = data.response as { status?: unknown; body?: unknown };
  return {
    status: Number(response.status ?? 200),
    body: (response.body ?? {}) as Record<string, unknown>,
  };
}

export async function saveIdempotentResponse(
  value: string | null,
  operation: string,
  status: number,
  body: Record<string, unknown>,
  actorId?: string,
) {
  const key = normalizeIdempotencyKey(value);
  if (!key) return true;
  const { error } = await createSupabaseAdminClient()
    .from("idempotency_keys")
    .insert({
      key,
      operation,
      actor_id: actorId ?? null,
      response: { status, body } as never,
    });
  if (error?.code === "23505") return false;
  if (error) throw new Error(`Idempotency write failed: ${error.message}`);
  return true;
}

export async function recordAudit(
  action: string,
  entityType: string,
  payload: Record<string, unknown>,
  actorId?: string,
) {
  const { error } = await createSupabaseAdminClient()
    .from("audit_events")
    .insert({
      actor_id: actorId ?? null,
      operating_company_id: PILOT_OPERATING_COMPANY_ID,
      action,
      entity_type: entityType,
      entity_id: null,
      payload: { source: "korama-app", ...payload } as never,
    });
  if (error) throw new Error(`Audit write failed: ${error.message}`);
}
