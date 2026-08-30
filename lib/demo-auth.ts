import { createHmac, timingSafeEqual } from "node:crypto";

export const DEMO_COOKIE = "korama_demo_session";
export const ROLE_COOKIE = "korama_demo_role";
const GUIDED_ROLES = ["consumer", "warehouse_operator", "safety_officer"] as const;
type GuidedRole = (typeof GUIDED_ROLES)[number];

function runtimeEnv(name: string) { return globalThis.process?.env?.[name]; }
function truthy(value: string | undefined) { return ["1", "true", "yes"].includes((value ?? "").toLowerCase()); }
export function isHostedEnvironment() { return truthy(runtimeEnv("KORAMA_STAGING")) || truthy(runtimeEnv("KORAMA_PRODUCTION")); }
export function isProductionLike() { return runtimeEnv("NODE_ENV") === "production" || isHostedEnvironment(); }
export function supabaseAuthEnabled() { return truthy(runtimeEnv("KORAMA_USE_SUPABASE")) && truthy(runtimeEnv("KORAMA_USE_SUPABASE_AUTH")); }
function sessionSecret() { return runtimeEnv("KORAMA_DEMO_SESSION_SECRET") || "local-korama-demo-session-secret"; }
export function configuredAccessCode() { return runtimeEnv("KORAMA_DEMO_ACCESS_CODE") || "KORAMA-DEMO"; }
export function configuredIdentityEmail(role: GuidedRole) {
  const names: Record<GuidedRole, string> = {
    consumer: "KORAMA_CONSUMER_EMAIL",
    warehouse_operator: "KORAMA_WAREHOUSE_EMAIL",
    safety_officer: "KORAMA_SAFETY_EMAIL",
  };
  return runtimeEnv(names[role]) || `korama-${role.replace("_operator", "") || "consumer"}@example.test`;
}
export function configuredSeedPassword() { return runtimeEnv("KORAMA_SEED_PASSWORD") || ""; }
export function sessionToken() { return createHmac("sha256", sessionSecret()).update(configuredAccessCode()).digest("hex"); }
function cookieValue(request: Request, name: string) { return request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1) ?? ""; }
function roleSignature(role: GuidedRole) { return createHmac("sha256", sessionSecret()).update(`korama-guided-role:${role}`).digest("hex"); }
export function hasValidSession(request: Request) {
  if (isHostedEnvironment() && (!runtimeEnv("KORAMA_DEMO_SESSION_SECRET") || !runtimeEnv("KORAMA_DEMO_ACCESS_CODE"))) return false;
  const token = cookieValue(request, DEMO_COOKIE);
  const expected = Buffer.from(sessionToken());
  const received = Buffer.from(token);
  return received.length === expected.length && timingSafeEqual(received, expected);
}
function secureCookies() { return isHostedEnvironment() || allowedConfiguredOrigin()?.startsWith("https://") === true; }
export function sessionCookie() { return `${DEMO_COOKIE}=${sessionToken()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800${secureCookies() ? "; Secure" : ""}`; }
export function roleCookie(role: GuidedRole) { return `${ROLE_COOKIE}=${role}.${roleSignature(role)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800${secureCookies() ? "; Secure" : ""}`; }

function allowedConfiguredOrigin() {
  const configured = runtimeEnv("NEXT_PUBLIC_APP_URL")?.trim();
  if (!configured) return null;
  try { return new URL(configured).origin; } catch { return null; }
}

function allowedRequestOrigin(origin: string) {
  const configured = allowedConfiguredOrigin();
  if (isHostedEnvironment() && (!configured || !configured.startsWith("https://"))) return false;
  if (configured && origin === configured) return true;
  return !isHostedEnvironment() && /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin);
}

/** Guard cookie-authenticated mutations against cross-site requests. */
export function trustedRequestOrigin(request: Request) {
  const origin = request.headers.get("origin")?.trim();
  const referer = request.headers.get("referer")?.trim();
  let candidate = origin;
  if (!candidate && referer) {
    try { candidate = new URL(referer).origin; } catch { candidate = ""; }
  }
  if (!candidate) {
    return isHostedEnvironment()
      ? Response.json({ error: "A same-origin request is required" }, { status: 403, headers: { "cache-control": "no-store" } })
      : null;
  }
  return allowedRequestOrigin(candidate)
    ? null
    : Response.json({ error: "A same-origin request is required" }, { status: 403, headers: { "cache-control": "no-store", vary: "Origin" } });
}
export function currentRole(request: Request): GuidedRole {
  const parts = cookieValue(request, ROLE_COOKIE).split(".");
  if (parts.length !== 2) return "consumer";
  const [role, signature] = parts;
  if (!GUIDED_ROLES.includes(role as GuidedRole) || !signature) return "consumer";
  const expected = Buffer.from(roleSignature(role as GuidedRole));
  const received = Buffer.from(signature);
  return received.length === expected.length && timingSafeEqual(received, expected) ? role as GuidedRole : "consumer";
}
export function unauthorizedUnlessRole(request: Request, roles: Array<"consumer" | "warehouse_operator" | "safety_officer">) { const unauthorized = unauthorizedUnlessSession(request); if (unauthorized) return unauthorized; return roles.includes(currentRole(request) as "consumer" | "warehouse_operator" | "safety_officer") ? null : Response.json({ error: "This guided identity does not have permission for that surface" }, { status: 403 }); }
export async function authenticatedRole(request: Request): Promise<GuidedRole | null> {
  if (!supabaseAuthEnabled()) return currentRole(request);
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const client = await createSupabaseServerClient();
  if (!client) return null;
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) return null;
  const { data: assignments, error: assignmentError } = await client.from("role_assignments").select("role").eq("profile_id", user.id);
  if (assignmentError) return null;
  const role = assignments?.find((assignment) => GUIDED_ROLES.includes(assignment.role as GuidedRole))?.role;
  return role && GUIDED_ROLES.includes(role as GuidedRole) ? role as GuidedRole : null;
}
export async function authenticatedUserId(): Promise<string | null> {
  if (!supabaseAuthEnabled()) return null;
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const client = await createSupabaseServerClient();
  if (!client) return null;
  const { data: { user }, error } = await client.auth.getUser();
  return error || !user ? null : user.id;
}
export async function unauthorizedUnlessAuthenticatedRole(request: Request, roles: Array<GuidedRole>) {
  const unauthorized = unauthorizedUnlessSession(request); if (unauthorized) return unauthorized;
  const role = await authenticatedRole(request);
  return role && roles.includes(role) ? null : Response.json({ error: "This guided identity does not have permission for that surface" }, { status: 403 });
}
export function requireDemoSession(request: Request) { if (!hasValidSession(request)) throw new Response(JSON.stringify({ error: "Demo session required" }), { status: 401, headers: { "content-type": "application/json" } }); }
export function unauthorizedUnlessSession(request: Request) { return hasValidSession(request) ? null : Response.json({ error: "Demo session required" }, { status: 401 }); }
