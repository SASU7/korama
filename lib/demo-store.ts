import { calculateQuote, DeliveryAddress, DemoState, getProduct, markOrder, seedDemoState } from "@/lib/domain";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

const SNAPSHOT_ID = "korama-demo";
const NIGERIA_OPERATING_COMPANY_ID = "10000000-0000-0000-0000-000000000002";
type CachedResponse = { status: number; body: Record<string, unknown>; operation: string };
const globalStore = globalThis as typeof globalThis & { __koramaDemo?: DemoState; __koramaDemoRevision?: number; __koramaIdempotency?: Map<string, CachedResponse> };
function runtimeEnv(name: string) { return globalThis.process?.env?.[name]; }
function usesSupabase() { return ["1", "true", "yes"].includes((runtimeEnv("KORAMA_USE_SUPABASE") ?? "").toLowerCase()); }
function supabaseAdmin() {
  const url = runtimeEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = runtimeEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase persistence requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  return createClient<Database>(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
export function demoStore() { globalStore.__koramaDemo ??= seedDemoState(); return globalStore.__koramaDemo; }
export function resetDemoStore() { globalStore.__koramaDemo = seedDemoState(); return globalStore.__koramaDemo; }
function idempotencyStore() { globalStore.__koramaIdempotency ??= new Map(); return globalStore.__koramaIdempotency; }
function normalizeIdempotencyKey(value: string | null) {
  const key = value?.trim() ?? "";
  if (key.length > 200) throw new Error("Idempotency-Key must be 200 characters or fewer");
  return key;
}
export async function getIdempotentResponse(value: string | null, operation: string) {
  const key = normalizeIdempotencyKey(value);
  if (!key) return null;
  if (!usesSupabase()) {
    const cached = idempotencyStore().get(key);
    if (cached && cached.operation !== operation) throw new Error("Idempotency-Key was already used for another operation");
    return cached ? { status: cached.status, body: cached.body } : null;
  }
  const { data, error } = await supabaseAdmin().from("idempotency_keys").select("operation,response").eq("key", key).maybeSingle();
  if (error) throw new Error(`Supabase idempotency read failed: ${error.message}`);
  if (!data) return null;
  if (data.operation !== operation) throw new Error("Idempotency-Key was already used for another operation");
  const response = data.response as { status?: unknown; body?: unknown };
  return { status: Number(response.status ?? 200), body: (response.body ?? {}) as Record<string, unknown> };
}
export async function saveIdempotentResponse(value: string | null, operation: string, status: number, body: Record<string, unknown>) {
  const key = normalizeIdempotencyKey(value);
  if (!key) return true;
  const cached = { status, body };
  if (!usesSupabase()) { idempotencyStore().set(key, { ...cached, operation }); return true; }
  const { error } = await supabaseAdmin().from("idempotency_keys").insert({ key, operation, actor_id: null, response: cached as never });
  if (error?.code === "23505") {
    const existing = await getIdempotentResponse(key, operation);
    if (existing) return false;
  }
  if (error) throw new Error(`Supabase idempotency write failed: ${error.message}`);
  return true;
}
export async function recordDemoAudit(action: string, entityType: string, payload: Record<string, unknown>) {
  if (!usesSupabase()) return;
  const { error } = await supabaseAdmin().from("audit_events").insert({ actor_id: null, operating_company_id: NIGERIA_OPERATING_COMPANY_ID, action, entity_type: entityType, entity_id: null, payload: { source: "korama-demo", ...payload } as never });
  if (error) throw new Error(`Supabase audit write failed: ${error.message}`);
}
export async function hydrateDemoStore() {
  if (!usesSupabase()) return demoStore();
  const admin = supabaseAdmin();
  const { data, error } = await admin.from("demo_state_snapshots").select("revision,payload").eq("id", SNAPSHOT_ID).maybeSingle();
  if (error) throw new Error(`Supabase demo state read failed: ${error.message}`);
  if (!data) {
    globalStore.__koramaDemo = seedDemoState();
    globalStore.__koramaDemoRevision = 0;
    const { error: insertError } = await admin.from("demo_state_snapshots").insert({ id: SNAPSHOT_ID, revision: 0, payload: globalStore.__koramaDemo as never, updated_at: new Date().toISOString() });
    if (insertError && insertError.code !== "23505") throw new Error(`Supabase demo state bootstrap failed: ${insertError.message}`);
    if (insertError?.code === "23505") return hydrateDemoStore();
    return globalStore.__koramaDemo;
  }
  globalStore.__koramaDemo = data.payload as unknown as DemoState;
  globalStore.__koramaDemoRevision = Number(data.revision);
  return globalStore.__koramaDemo;
}
export async function persistDemoStore() {
  const state = demoStore();
  if (!usesSupabase()) return state;
  const revision = globalStore.__koramaDemoRevision ?? 0;
  const nextRevision = revision + 1;
  const { data, error } = await supabaseAdmin().from("demo_state_snapshots").update({ payload: state as never, revision: nextRevision, updated_at: new Date().toISOString() }).eq("id", SNAPSHOT_ID).eq("revision", revision).select("revision").maybeSingle();
  if (error) throw new Error(`Supabase demo state write failed: ${error.message}`);
  if (!data) throw new Error("Supabase demo state changed concurrently; refresh and retry");
  globalStore.__koramaDemoRevision = Number(data.revision);
  return state;
}
export async function resetPersistedDemoStore() {
  resetDemoStore();
  idempotencyStore().clear();
  if (usesSupabase()) {
    globalStore.__koramaDemoRevision = 0;
    const admin = supabaseAdmin();
    const { error } = await admin.from("demo_state_snapshots").upsert({ id: SNAPSHOT_ID, revision: 0, payload: globalStore.__koramaDemo as never, updated_at: new Date().toISOString() });
    if (error) throw new Error(`Supabase demo state reset failed: ${error.message}`);
    const { error: idempotencyError } = await admin.from("idempotency_keys").delete().neq("key", "");
    if (idempotencyError) throw new Error(`Supabase idempotency reset failed: ${idempotencyError.message}`);
  }
  return demoStore();
}
export function createDemoOrder(productId: string, quantity: number, address: DeliveryAddress) {
  const state = demoStore();
  const fresh = seedDemoState();
  const product = getProduct(state, productId);
  if (!product.purchasable) throw new Error("This listing is roadmap-only");
  if (product.market !== "NG") throw new Error("The deep demo order is scoped to Nigeria");
  const quote = calculateQuote(state, productId, quantity);
  state.cart = [{ productId, quantity }];
  state.order = { reference: "KOR-NG-240829-001", status: "pending_payment", productId, quantity, address, compliance: { ...state.compliance, evidence: [...state.compliance.evidence] }, ...quote };
  state.shipment = fresh.shipment;
  state.tasks = fresh.tasks;
  state.sortie = fresh.sortie;
  state.batches = fresh.batches;
  state.transfer = fresh.transfer;
  state.compliance = fresh.compliance;
  state.orderEvents = fresh.orderEvents;
  state.orderEvents[0].complete = true;
  state.orderEvents[0].at = new Date().toISOString();
  state.lastMutation = new Date().toISOString();
  return state.order;
}
export function verifyDemoPayment(paymentReference: string, amountMinor: number, currency: string) {
  const state = demoStore();
  if (!state.order) throw new Error("No pending order exists");
  if (state.order.status !== "pending_payment") {
    if (state.order.paymentReference !== paymentReference || state.order.totalMinor !== amountMinor || state.order.currency !== currency) throw new Error("Duplicate payment does not match the original verified payment");
    return state.order;
  }
  if (state.order.totalMinor !== amountMinor || state.order.currency !== currency) throw new Error("Payment amount or currency does not match the server quote");
  state.order.paymentReference = paymentReference;
  markOrder(state, "paid");
  state.lastMutation = new Date().toISOString();
  return state.order;
}
