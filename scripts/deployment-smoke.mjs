const baseUrl = (process.env.KORAMA_DEPLOYMENT_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
if (!baseUrl) throw new Error("Set KORAMA_DEPLOYMENT_URL or NEXT_PUBLIC_APP_URL");
if (!baseUrl.startsWith("https://") && process.env.KORAMA_ALLOW_HTTP !== "true") throw new Error("Deployment smoke checks require an HTTPS URL");

async function get(path) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "manual", signal: AbortSignal.timeout(10000) });
  const text = await response.text();
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch { throw new Error(`${path} returned non-JSON content`); }
  return { response, body };
}

const health = await get("/api/health");
if (health.response.status !== 200 || health.body.status !== "ok") throw new Error(`/api/health is not ready (HTTP ${health.response.status}): ${JSON.stringify(health.body.checks ?? {})}`);
const serializedHealth = JSON.stringify(health.body);
for (const secretName of ["SUPABASE_SERVICE_ROLE_KEY", "PAYSTACK_SECRET_KEY"]) {
  if (serializedHealth.includes(secretName)) throw new Error(`/api/health exposed a server-only name: ${secretName}`);
}

const state = await get("/api/app/state");
if (state.response.status !== 200 || !Array.isArray(state.body.state?.products)) throw new Error(`/api/app/state did not return the public catalogue (HTTP ${state.response.status})`);
if (state.body.auth?.authenticated !== false) throw new Error("Anonymous application state must not report an authenticated user");
console.log(`deployment smoke pass: ${baseUrl} health ready and public catalogue available`);
