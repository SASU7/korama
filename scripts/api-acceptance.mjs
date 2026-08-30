import { createHmac } from "node:crypto";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";

const host = "127.0.0.1";
const port = process.env.KORAMA_ACCEPTANCE_PORT ?? "3100";
const baseUrl = `http://${host}:${port}`;
const cookies = new Map();
const normalizedAcceptance = ["1", "true", "yes"].includes((process.env.KORAMA_NORMALIZED_ACCEPTANCE ?? "").toLowerCase());

if (normalizedAcceptance) {
  const localEnv = await readFile(".env", "utf8").catch(() => "");
  for (const line of localEnv.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

async function bootstrapNormalizedIdentities() {
  if (!normalizedAcceptance) return;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Normalized HTTP acceptance requires local Supabase credentials");
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)(?::\d+)?$/i.test(url)) throw new Error("Normalized HTTP acceptance is limited to a local Supabase URL");
  const password = process.env.KORAMA_SEED_PASSWORD?.trim() || `KoramaAcceptance-${Date.now()}-test`;
  const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  const identities = [
    { email: process.env.KORAMA_CONSUMER_EMAIL ?? "korama-consumer@example.test", displayName: "Nigerian consumer", role: "consumer" },
    { email: process.env.KORAMA_WAREHOUSE_EMAIL ?? "korama-warehouse@example.test", displayName: "Warehouse + compliance", role: "warehouse_operator" },
    { email: process.env.KORAMA_SAFETY_EMAIL ?? "korama-safety@example.test", displayName: "Drone safety officer", role: "safety_officer" },
  ];
  process.env.KORAMA_CONSUMER_EMAIL ??= identities[0].email;
  process.env.KORAMA_WAREHOUSE_EMAIL ??= identities[1].email;
  process.env.KORAMA_SAFETY_EMAIL ??= identities[2].email;
  for (const identity of identities) {
    let user = data.users.find((candidate) => candidate.email?.toLowerCase() === identity.email.toLowerCase());
    if (!user) {
      const created = await supabase.auth.admin.createUser({ email: identity.email, password, email_confirm: true });
      if (created.error || !created.data.user) throw created.error ?? new Error(`Could not create ${identity.email}`);
      user = created.data.user;
    } else {
      const updated = await supabase.auth.admin.updateUserById(user.id, { password, email_confirm: true });
      if (updated.error) throw updated.error;
    }
    const profile = await supabase.from("profiles").upsert({ id: user.id, display_name: identity.displayName, operating_company_id: "10000000-0000-0000-0000-000000000002", market_id: "20000000-0000-0000-0000-000000000002" }, { onConflict: "id" });
    if (profile.error) throw profile.error;
    const assignment = await supabase.from("role_assignments").upsert({ profile_id: user.id, role: identity.role }, { onConflict: "profile_id,role" });
    if (assignment.error) throw assignment.error;
  }
  process.env.KORAMA_SEED_PASSWORD = password;
}

function cookieHeader() { return [...cookies].map(([name, value]) => `${name}=${value}`).join("; "); }

function absorbCookies(response) {
  const values = response.headers.getSetCookie?.() ?? (response.headers.get("set-cookie") ? [response.headers.get("set-cookie")] : []);
  for (const value of values) {
    const pair = value.split(";", 1)[0];
    const separator = pair.indexOf("=");
    if (separator > 0) cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
}

async function request(path, init = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has("origin")) headers.set("origin", baseUrl);
  if (cookies.size) headers.set("cookie", cookieHeader());
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  absorbCookies(response);
  const text = await response.text();
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  return { response, body };
}

async function waitForServer() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/demo/session`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Built app did not become ready within 30 seconds");
}

await bootstrapNormalizedIdentities();
const environment = {
  ...process.env,
  HOSTNAME: host,
  PORT: port,
  KORAMA_DEMO_ACCESS_CODE: "KORAMA-DEMO",
  NEXT_PUBLIC_APP_URL: baseUrl,
  PAYSTACK_SECRET_KEY: "",
  PAYSTACK_WEBHOOK_SECRET: "demo-paystack-webhook-secret",
  KORAMA_USE_SUPABASE: normalizedAcceptance ? "true" : "false",
  KORAMA_USE_SUPABASE_AUTH: normalizedAcceptance ? "true" : "false",
  KORAMA_USE_NORMALIZED_REPOSITORY: normalizedAcceptance ? "true" : "false",
};
const server = spawn("pnpm", ["start", "-H", host, "-p", port], { env: environment, stdio: ["ignore", "pipe", "pipe"] });
let serverOutput = "";
server.stdout.on("data", (chunk) => { serverOutput += chunk.toString(); });
server.stderr.on("data", (chunk) => { serverOutput += chunk.toString(); });

try {
  await waitForServer();

  let result = await request("/");
  assert.equal(result.response.status, 200, "the access gate must render for unauthenticated visitors");
  assert.match(result.body.raw ?? "", /Demo access code/, "unauthenticated visitors must receive the access gate");

  result = await request("/api/health");
  assert.equal(result.response.status, 200, "health endpoint must report a ready local adapter");
  assert.equal(result.body.status, "ok");
  assert.equal(result.body.checks.adapter, normalizedAcceptance ? "normalized" : "snapshot", "health must identify the active repository adapter");
  assert.equal(result.response.headers.get("x-request-id"), result.body.requestId, "health responses must include a request ID");
  assert.equal(result.response.headers.get("x-content-type-options"), "nosniff", "responses must disable content sniffing");
  assert.equal(result.response.headers.get("x-frame-options"), "DENY", "responses must prevent framing");

  result = await request("/api/demo/state");
  assert.equal(result.response.status, 401, "state must require a demo session");

  result = await request("/api/demo/access", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: "wrong-code" }) });
  assert.equal(result.response.status, 401, "incorrect access code must be rejected");

  result = await request("/api/demo/access", { method: "POST", headers: { "content-type": "application/json", origin: "https://attacker.example" }, body: JSON.stringify({ code: "KORAMA-DEMO" }) });
  assert.equal(result.response.status, 403, "cross-origin access attempts must be rejected");

  result = await request("/api/demo/access", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: "KORAMA-DEMO" }) });
  assert.equal(result.response.status, 200, "correct access code must establish a session");

  result = await request("/");
  assert.equal(result.response.status, 200, "the workspace must render after access is granted");
  assert.match(result.body.raw ?? "", /Server-guided identity/, "authenticated visitors must receive the workspace");

  result = await request("/api/demo/session");
  assert.equal(result.body.role, "consumer", "new sessions start as the consumer identity");

  result = await request("/api/demo/identity", { method: "POST", headers: { "content-type": "application/json", origin: "https://attacker.example" }, body: JSON.stringify({ role: "warehouse_operator" }) });
  assert.equal(result.response.status, 403, "cross-origin role changes must be rejected");

  cookies.set("korama_demo_role", "warehouse_operator");
  result = await request("/api/demo/session");
  assert.equal(result.body.role, "consumer", "unsigned guided-role cookies must be ignored");
  cookies.delete("korama_demo_role");

  result = await request("/api/demo/reset", { method: "POST", headers: { "x-korama-demo-code": "KORAMA-DEMO" } });
  assert.equal(result.response.status, 403, "consumers cannot reset the demo scenario");
  result = await request("/api/demo/identity", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ role: "warehouse_operator" }) });
  assert.equal(result.response.status, 200);
  result = await request("/api/demo/reset", { method: "POST", headers: { "x-korama-demo-code": "KORAMA-DEMO" } });
  assert.equal(result.response.status, 200, "warehouse identity can reset the demo scenario");
  result = await request("/api/demo/identity", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ role: "consumer" }) });
  assert.equal(result.response.status, 200);
  if (normalizedAcceptance) {
    result = await request("/api/demo/session");
    assert.equal(result.body.role, "consumer", "normalized Auth identity switch must establish the consumer role");
  }

  result = await request("/api/demo/state");
  const products = result.body.products;
  if (normalizedAcceptance) assert.equal(result.body.batches.length, 0, "consumer state must not expose normalized inventory records");
  if (process.env.KORAMA_EXPECT_PERSISTED === "true") assert.notEqual(result.body.lastMutation, "2026-08-29T10:00:00.000Z", "Supabase-backed state must survive a server restart");
  assert.ok(products.some((product) => product.market === "NG" && product.origin === "ghana_origin_export" && product.purchasable), "Nigeria must expose purchasable Ghana-origin stock");
  assert.ok(products.some((product) => product.market === "NG" && product.origin === "direct_import" && !/through Ghana|Ghana-routed/i.test(product.description)), "Nigeria must expose a direct-import comparison without Ghana routing");
  assert.ok(products.some((product) => product.origin === "marketplace_future" && !product.purchasable), "roadmap marketplace inventory must remain gated");

  result = await request("/api/cart/quote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productId: "shea-balm", quantity: 1 }) });
  assert.equal(result.response.status, 200, "server cart quote must calculate the checkout total");
  assert.equal(result.body.quote.currency, "NGN");
  result = await request("/api/cart/quote", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productId: "shea-balm", quantity: "invalid" }) });
  assert.equal(result.response.status, 400, "malformed quantities must be rejected");
  assert.ok(result.body.requestId, "API errors must include a request ID");
  assert.equal(result.response.headers.get("x-request-id"), result.body.requestId, "request ID must be returned in the response header");

  const address = { recipientName: "Amina Okafor", addressLine: "12 Admiralty Way", city: "Lagos", countryCode: "NG" };
  result = await request("/api/payments/paystack/initialize", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productId: "shea-balm", quantity: 1, address }) });
  assert.equal(result.response.status, 200, "shea checkout must initialize");
  const reference = result.body.reference;
  const totalMinor = result.body.order.totalMinor;
  assert.equal(result.body.order.status, "pending_payment");
  assert.equal(result.body.order.compliance.assessment, "provisionally_eligible", "the order must preserve the provisional origin snapshot");

  result = await request(`/api/fulfilment/orders/${result.body.order.reference}/allocate`, { method: "POST" });
  assert.equal(result.response.status, 403, "consumer identity cannot allocate warehouse stock");

  result = await request(`/api/payments/paystack/verify?reference=${encodeURIComponent(reference)}`);
  assert.equal(result.response.status, 200, "server verification must mark the order paid");
  assert.equal(result.body.order.status, "paid");

  result = await request(`/api/payments/paystack/verify?reference=${encodeURIComponent(reference)}`);
  assert.equal(result.response.status, 200, "duplicate verification must be idempotent");
  assert.equal(result.body.order.status, "paid");

  const malformedWebhook = JSON.stringify({ event: "charge.success", data: { status: "success", reference } });
  const malformedSignature = createHmac("sha512", "demo-paystack-webhook-secret").update(malformedWebhook).digest("hex");
  result = await request("/api/webhooks/paystack", { method: "POST", headers: { "content-type": "application/json", "x-paystack-signature": malformedSignature }, body: malformedWebhook });
  assert.equal(result.response.status, 400, "webhooks must reject missing amount and currency");

  const webhookPayload = JSON.stringify({ event: "charge.success", data: { status: "success", reference, amount: totalMinor, currency: "NGN" } });
  const signature = createHmac("sha512", "demo-paystack-webhook-secret").update(webhookPayload).digest("hex");
  result = await request("/api/webhooks/paystack", { method: "POST", headers: { "content-type": "application/json", "x-paystack-signature": signature }, body: webhookPayload });
  assert.equal(result.response.status, 200, "duplicate webhook must be accepted idempotently");
  assert.equal(result.body.idempotent, true);

  result = await request("/api/demo/identity", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ role: "warehouse_operator" }) });
  assert.equal(result.response.status, 200);
  result = await request("/api/demo/state");
  const orderReference = result.body.order?.reference ?? "KOR-NG-240829-001";
  const allocationKey = `allocation-${Date.now()}`;
  result = await request(`/api/fulfilment/orders/${orderReference}/allocate`, { method: "POST", headers: { "idempotency-key": allocationKey } });
  assert.equal(result.response.status, 200, "warehouse identity must allocate paid stock");
  assert.equal(result.body.batch.batch, "NK-SB-2407", "FEFO must select the earliest valid batch");
  result = await request(`/api/fulfilment/orders/${orderReference}/allocate`, { method: "POST", headers: { "idempotency-key": allocationKey } });
  assert.equal(result.response.status, 200, "duplicate allocation must return the original result");
  assert.equal(result.body.batch.allocated, 1, "duplicate allocation must not reserve another unit");

  result = await request("/api/demo/identity", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ role: "safety_officer" }) });
  assert.equal(result.response.status, 200);
  result = await request(`/api/delivery/sorties/${orderReference}/command`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ command: "preflight" }) });
  assert.equal(result.response.status, 400, "delivery controls must remain locked until dispatch");
  result = await request("/api/demo/identity", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ role: "warehouse_operator" }) });
  assert.equal(result.response.status, 200);

  for (const status of ["picked", "packed", "dispatched"]) {
    result = await request(`/api/orders/${orderReference}/advance`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) });
    assert.equal(result.response.status, 200, `warehouse must advance to ${status}`);
  }
  result = await request(`/api/orders/${orderReference}`);
  assert.equal(result.body.shipment.status, "in_transit", "dispatch must create and start the shipment leg");
  assert.equal(result.body.shipment.legs[0].status, "in_transit");
  assert.equal(result.body.shipment.compliance.assessment, "provisionally_eligible", "the shipment must retain the order origin snapshot");

  result = await request("/api/demo/identity", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ role: "safety_officer" }) });
  assert.equal(result.response.status, 200);
  result = await request(`/api/delivery/sorties/${orderReference}/command`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ command: "inject_weather" }) });
  assert.equal(result.response.status, 200, `unsafe weather must lock the sortie: ${JSON.stringify(result.body)}`);
  assert.equal(result.body.shipment.status, "fallback", "unsafe weather must create courier fallback");
  assert.equal(result.body.shipment.legs.at(-1).mode, "ground_courier");
  result = await request(`/api/delivery/sorties/${orderReference}/command`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ command: "reset_weather" }) });
  assert.equal(result.response.status, 200, "weather reset must restore the demo flight path");
  assert.equal(result.body.shipment.status, "in_transit");
  result = await request(`/api/delivery/sorties/${orderReference}/command`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ command: "preflight" }) });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.sortie.status, "cleared");
  result = await request(`/api/delivery/sorties/${orderReference}/command`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ command: "launch" }) });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.sortie.status, "launched");
  result = await request(`/api/delivery/sorties/${orderReference}/command`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ command: "advance" }) });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.sortie.status, "en_route");
  result = await request(`/api/delivery/sorties/${orderReference}/command`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ command: "complete" }) });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.order.status, "delivered");
  assert.equal(result.body.shipment.status, "delivered");

  result = await request("/api/payments/paystack/initialize", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productId: "shea-balm", quantity: 1, address }) });
  assert.equal(result.response.status, 200, "a new deterministic order can start after the previous journey");
  result = await request("/api/demo/state");
  assert.equal(result.body.order.status, "pending_payment");
  assert.equal(result.body.shipment, null, "a fresh order must not inherit the previous shipment");
  assert.equal(result.body.tasks[1].done, false, "a fresh order must reset warehouse tasks");
  assert.equal(result.body.batches.find((batch) => batch.batch === "NK-SB-2407").allocated, normalizedAcceptance ? 1 : 0, normalizedAcceptance ? "normalized inventory history must remain allocated until an explicit demo reset" : "a fresh snapshot order must reset inventory allocations");

  if (normalizedAcceptance || ["1", "true", "yes"].includes((process.env.KORAMA_USE_SUPABASE ?? "").toLowerCase())) {
    const auditUrl = new URL("/rest/v1/audit_events", process.env.NEXT_PUBLIC_SUPABASE_URL);
    auditUrl.searchParams.set("select", "id");
    auditUrl.searchParams.set("payload->>source", "eq.korama-demo");
    auditUrl.searchParams.set("limit", "1");
    const auditResponse = await fetch(auditUrl, { headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` } });
    assert.equal(auditResponse.status, 200, "Supabase service role must read demo audit records");
    assert.ok((await auditResponse.json()).length > 0, "Supabase adapter must record audit events");
  }

  if (normalizedAcceptance) {
    result = await request("/api/demo/identity", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ role: "warehouse_operator" }) });
    assert.equal(result.response.status, 200, "warehouse identity must be available for final reset");
    result = await request("/api/demo/reset", { method: "POST", headers: { "x-korama-demo-code": "KORAMA-DEMO" } });
    assert.equal(result.response.status, 200, "normalized acceptance must finish with a successful reset");
    result = await request("/api/demo/state");
    assert.equal(result.body.order, null, "normalized reset must remove temporary orders");
    assert.equal(result.body.batches.find((batch) => batch.batch === "NK-SB-2407").allocated, 0, "normalized reset must restore canonical inventory");
  }

  console.log("api acceptance pass: access, payment idempotency, role isolation, FEFO, fulfilment, and drone lifecycle");
} catch (error) {
  console.error(serverOutput);
  throw error;
} finally {
  server.kill("SIGTERM");
}
