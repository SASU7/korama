import "server-only";

import { createClient, type User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { UserRole } from "@/lib/domain";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export { trustedRequestOrigin } from "@/lib/request-security";

export const ACTIVE_ROLE_COOKIE = "korama_active_role";
export const APP_ROLES = [
  "consumer",
  "warehouse_operator",
  "safety_officer",
] as const;

export type AuthContext = {
  user: User;
  roles: UserRole[];
  activeRole: UserRole;
};

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

  const roles = [
    ...new Set((assignments ?? []).map(({ role }) => role).filter(isAppRole)),
  ];
  if (!roles.includes("consumer")) roles.unshift("consumer");
  const requestedRole =
    (await cookies()).get(ACTIVE_ROLE_COOKIE)?.value ?? "consumer";
  const activeRole = roles.includes(requestedRole as UserRole)
    ? (requestedRole as UserRole)
    : "consumer";
  return { user, roles, activeRole };
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
  if (allowedRoles && !allowedRoles.includes(context.activeRole)) {
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
}
