import { createHmac, timingSafeEqual } from "node:crypto";

export const DEMO_COOKIE = "korama_demo_session";
export const ROLE_COOKIE = "korama_demo_role";
const SESSION_SECRET = process.env.KORAMA_DEMO_SESSION_SECRET ?? "local-korama-demo-session-secret";
const GUIDED_ROLES = ["consumer", "warehouse_operator", "safety_officer"] as const;
type GuidedRole = (typeof GUIDED_ROLES)[number];

export function configuredAccessCode() { return process.env.KORAMA_DEMO_ACCESS_CODE ?? "KORAMA-DEMO"; }
export function sessionToken() { return createHmac("sha256", SESSION_SECRET).update(configuredAccessCode()).digest("hex"); }
function cookieValue(request: Request, name: string) { return request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1) ?? ""; }
function roleSignature(role: GuidedRole) { return createHmac("sha256", SESSION_SECRET).update(`korama-guided-role:${role}`).digest("hex"); }
export function hasValidSession(request: Request) {
  const token = cookieValue(request, DEMO_COOKIE);
  const expected = Buffer.from(sessionToken());
  const received = Buffer.from(token);
  return received.length === expected.length && timingSafeEqual(received, expected);
}
export function sessionCookie() { return `${DEMO_COOKIE}=${sessionToken()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800${process.env.NODE_ENV === "production" ? "; Secure" : ""}`; }
export function roleCookie(role: GuidedRole) { return `${ROLE_COOKIE}=${role}.${roleSignature(role)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800${process.env.NODE_ENV === "production" ? "; Secure" : ""}`; }
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
export function requireDemoSession(request: Request) { if (!hasValidSession(request)) throw new Response(JSON.stringify({ error: "Demo session required" }), { status: 401, headers: { "content-type": "application/json" } }); }
export function unauthorizedUnlessSession(request: Request) { return hasValidSession(request) ? null : Response.json({ error: "Demo session required" }, { status: 401 }); }
