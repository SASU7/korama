import "server-only";

import { createClient, type User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { UserRole } from "@/lib/domain";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { applyPendingRoleAssignments } from "@/lib/supabase/role-admin";
export { trustedRequestOrigin } from "@/lib/request-security";

export const ACTIVE_ROLE_COOKIE = "korama_active_role";
export const APP_ROLES = [
  "consumer",
  "warehouse_operator",
  "safety_officer",
  "administrator",
] as const;

export type AuthContext = {
  user: User;
  /**
   * Every role the account may act as. For an administrator this is all of
   * APP_ROLES, not just the rows in role_assignments — see grantedRoles for
   * what was actually assigned.
   */
  roles: UserRole[];
  /** Exactly the roles held in role_assignments. */
  grantedRoles: UserRole[];
  activeRole: UserRole;
  isAdministrator: boolean;
};

/**
 * Administrator is a superset role: it satisfies every other role rather than
 * sitting beside them. private.has_role() applies the same rule inside the
 * database, so RLS and Realtime agree with these guards.
 */
export function effectiveRoles(granted: UserRole[]): UserRole[] {
  return granted.includes("administrator") ? [...APP_ROLES] : granted;
}

function requiredEnv(
  name: "NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY",
) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function createSupabaseAdminClient() {
  return createClient<Database>(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}

function isAppRole(role: string): role is UserRole {
  return APP_ROLES.includes(role as UserRole);
}

export async function authContext(): Promise<AuthContext | null> {
  const client = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) return null;

  const { data: assignments, error: assignmentsError } = await client
    .from("role_assignments")
    .select("role")
    .eq("profile_id", user.id);
  if (assignmentsError)
    throw new Error("Your account roles could not be loaded");

  const grantedRoles = [
    ...new Set((assignments ?? []).map(({ role }) => role).filter(isAppRole)),
  ];
  if (!grantedRoles.includes("consumer")) grantedRoles.unshift("consumer");
  const isAdministrator = grantedRoles.includes("administrator");
  const roles = effectiveRoles(grantedRoles);

  // An administrator with no cookie lands on "administrator" rather than
  // "consumer". The workspace reads its data as the active role, so defaulting
  // an admin to consumer would render Operations and Delivery empty until they
  // used the role switcher.
  const defaultRole: UserRole = isAdministrator ? "administrator" : "consumer";
  const requestedRole = (await cookies()).get(ACTIVE_ROLE_COOKIE)?.value;
  const activeRole =
    requestedRole && roles.includes(requestedRole as UserRole)
      ? (requestedRole as UserRole)
      : defaultRole;
  return { user, roles, grantedRoles, activeRole, isAdministrator };
}

export async function requireAuth(allowedRoles?: UserRole[]) {
  const context = await authContext();
  if (!context)
    return {
      response: Response.json(
        { error: "Sign in to continue" },
        { status: 401 },
      ),
      context: null,
    };
  // Administrators pass every role check whatever they are currently acting
  // as, so a mutation never depends on them remembering to switch role first.
  if (
    allowedRoles &&
    !allowedRoles.includes(context.activeRole) &&
    !context.isAdministrator
  ) {
    return {
      response: Response.json(
        { error: "Your assigned role cannot perform this action" },
        { status: 403 },
      ),
      context: null,
    };
  }
  return { response: null, context };
}

export async function ensureConsumerProfile(user: User) {
  const admin = createSupabaseAdminClient();
  const displayName = String(
    user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email ||
      "Korama customer",
  ).slice(0, 120);
  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: user.id,
      display_name: displayName,
      operating_company_id: "10000000-0000-0000-0000-000000000002",
      market_id: "20000000-0000-0000-0000-000000000002",
    },
    { onConflict: "id" },
  );
  if (profileError)
    throw new Error(`Profile setup failed: ${profileError.message}`);
  const { error: roleError } = await admin
    .from("role_assignments")
    .upsert(
      { profile_id: user.id, role: "consumer" },
      { onConflict: "profile_id,role" },
    );
  if (roleError) throw new Error(`Role setup failed: ${roleError.message}`);

  // Roles an administrator invited before this account existed. Applied here,
  // after the profile row, because role_assignments references profiles(id).
  await applyPendingRoleAssignments(user.id, user.email);
}
