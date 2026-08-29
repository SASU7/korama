import { createHmac, timingSafeEqual } from "node:crypto";

export const DEMO_COOKIE = "korama_demo_session";
export const ROLE_COOKIE = "korama_demo_role";
const SESSION_SECRET = process.env.KORAMA_DEMO_SESSION_SECRET ?? "local-korama-demo-session-secret";

export function configuredAccessCode() { return process.env.KORAMA_DEMO_ACCESS_CODE ?? "KORAMA-DEMO"; }
export function sessionToken() { return createHmac("sha256", SESSION_SECRET).update(configuredAccessCode()).digest("hex"); }
export function hasValidSession(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${DEMO_COOKIE}=`))?.split("=")[1] ?? "";
  const expected = Buffer.from(sessionToken());
  const received = Buffer.from(token);
  return received.length === expected.length && timingSafeEqual(received, expected);
}
export function sessionCookie() { return `${DEMO_COOKIE}=${sessionToken()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800${process.env.NODE_ENV === "production" ? "; Secure" : ""}`; }
export function roleCookie(role: "consumer" | "warehouse_operator" | "safety_officer") { return `${ROLE_COOKIE}=${role}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800${process.env.NODE_ENV === "production" ? "; Secure" : ""}`; }
export function currentRole(request: Request) { const cookieHeader = request.headers.get("cookie") ?? ""; return cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${ROLE_COOKIE}=`))?.split("=")[1] ?? "consumer"; }
export function unauthorizedUnlessRole(request: Request, roles: Array<"consumer" | "warehouse_operator" | "safety_officer">) { const unauthorized = unauthorizedUnlessSession(request); if (unauthorized) return unauthorized; return roles.includes(currentRole(request) as "consumer" | "warehouse_operator" | "safety_officer") ? null : Response.json({ error: "This guided identity does not have permission for that surface" }, { status: 403 }); }
export function requireDemoSession(request: Request) { if (!hasValidSession(request)) throw new Response(JSON.stringify({ error: "Demo session required" }), { status: 401, headers: { "content-type": "application/json" } }); }
export function unauthorizedUnlessSession(request: Request) { return hasValidSession(request) ? null : Response.json({ error: "Demo session required" }, { status: 401 }); }
