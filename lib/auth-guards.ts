import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authContext, type AuthContext } from "@/lib/auth";
import { PATHNAME_HEADER } from "@/lib/supabase/proxy";
import type { UserRole } from "@/lib/domain";

/** The path actually requested, supplied by proxy.ts. */
async function currentPath(fallback: string) {
  const value = (await headers()).get(PATHNAME_HEADER);
  return value?.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export const STAFF_ROLES = ["warehouse_operator", "safety_officer"] as const;

/**
 * Gate for the whole (workspace) route group: signed in, and holds at least
 * one staff role.
 */
export async function requireStaff(fallback = "/operations"): Promise<AuthContext> {
  const path = await currentPath(fallback);
  const auth = await authContext();
  if (!auth) redirect(`/auth/sign-in?next=${encodeURIComponent(path)}`);
  if (!STAFF_ROLES.some((role) => auth.roles.includes(role))) {
    redirect(`/access-denied?surface=${encodeURIComponent(path.replace(/^\//, ""))}`);
  }
  return auth;
}

/**
 * Per-page role assertion. Called in the page as well as the group layout,
 * because a layout is not a security boundary on its own: a client-side
 * navigation between sibling routes re-renders the page segment without
 * re-running the layout.
 */
export async function requireSurfaceRole(
  role: UserRole,
  surface: string,
): Promise<AuthContext> {
  const auth = await authContext();
  if (!auth) redirect(`/auth/sign-in?next=/${surface}`);
  if (!auth.roles.includes(role)) redirect(`/access-denied?surface=${surface}`);
  return auth;
}

export async function requireConsumer(next: string): Promise<AuthContext> {
  const auth = await authContext();
  if (!auth) redirect(`/auth/sign-in?next=${encodeURIComponent(next)}`);
  return auth;
}
