import "server-only";

import { adminClient } from "@/lib/supabase/admin-client";
import { ASSIGNABLE_ROLES } from "@/lib/navigation";
import type { UserRole } from "@/lib/domain";
import type { AdminUserRow, PendingInviteRow } from "@/lib/role-types";

/**
 * Role administration.
 *
 * Everything here uses the service-role client, so it bypasses RLS — the same
 * bargain catalogue-admin.ts makes. It is safe only because every caller is a
 * server action behind requireAdministrator(). Never import it from a client
 * component, and never expose a function here over an unguarded route.
 */

export type { AdminUserRow, PendingInviteRow };

/**
 * Sign-in is Google OAuth, so an address that is not a Google account can
 * never complete the callback. Restricting invitations to gmail.com is the
 * narrower rule the product wants for now: no Workspace domains, no aliases
 * we cannot verify. Widen this before onboarding a partner on their own
 * domain.
 */
const GMAIL = /^[a-z0-9][a-z0-9._%+-]*@gmail\.com$/;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function gmailAddressError(email: string) {
  if (!email) return "Enter an email address";
  if (email.includes("+"))
    return "Plus-addressed aliases can't be invited — use the plain address";
  if (!GMAIL.test(email)) return "Only @gmail.com addresses can be invited for now";
  return null;
}

export function isAssignableRole(value: string): value is UserRole {
  return (ASSIGNABLE_ROLES as readonly string[]).includes(value);
}

/**
 * Every account, with the roles it holds. auth.users is the source of truth
 * for identity (profiles has no email column), so this reads the admin auth
 * API and joins profiles/role_assignments onto it in memory.
 */
export async function listUserAccounts(): Promise<AdminUserRow[]> {
  const client = adminClient();

  const users = [];
  // 1000 accounts is far beyond this prototype; the cap stops a paging bug
  // from turning into an unbounded loop.
  for (let page = 1; page <= 5; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw new Error(`Accounts could not be listed: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < 200) break;
  }

  const [{ data: profiles }, { data: assignments }] = await Promise.all([
    client.from("profiles").select("id, display_name"),
    client.from("role_assignments").select("profile_id, role"),
  ]);

  return users
    .map((user) => ({
      id: user.id,
      email: user.email ?? "",
      displayName:
        (profiles ?? []).find((row) => row.id === user.id)?.display_name ??
        String(user.user_metadata?.full_name ?? user.email ?? "Unknown"),
      roles: (assignments ?? [])
        .filter((row) => row.profile_id === user.id)
        .map((row) => row.role as UserRole),
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at ?? null,
    }))
    .sort((left, right) => left.email.localeCompare(right.email));
}

export async function listPendingInvites(): Promise<PendingInviteRow[]> {
  const { data, error } = await adminClient()
    .from("pending_role_assignments")
    .select("id, email, role, created_at")
    .order("created_at");
  if (error) throw new Error(`Invitations could not be listed: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role as UserRole,
    createdAt: row.created_at,
  }));
}

export async function countAdministrators() {
  const { count, error } = await adminClient()
    .from("role_assignments")
    .select("id", { count: "exact", head: true })
    .eq("role", "administrator");
  if (error) throw new Error(`Administrators could not be counted: ${error.message}`);
  return count ?? 0;
}

export async function grantRole(profileId: string, role: UserRole) {
  const { error } = await adminClient()
    .from("role_assignments")
    .upsert({ profile_id: profileId, role }, { onConflict: "profile_id,role" });
  if (error) throw new Error(`The role could not be granted: ${error.message}`);
}

export async function revokeRole(profileId: string, role: UserRole) {
  const { error } = await adminClient()
    .from("role_assignments")
    .delete()
    .eq("profile_id", profileId)
    .eq("role", role);
  if (error) throw new Error(`The role could not be removed: ${error.message}`);
}

/**
 * Invite an address that may not have an account yet. If it already does, the
 * role is granted immediately instead — an invitation for an existing account
 * would sit unapplied until their *next* first sign-in, which never comes.
 */
export async function inviteRole(
  email: string,
  role: UserRole,
  invitedBy: string,
): Promise<{ applied: boolean }> {
  const accounts = await listUserAccounts();
  const existing = accounts.find((account) => account.email.toLowerCase() === email);
  if (existing) {
    await grantRole(existing.id, role);
    return { applied: true };
  }

  const { error } = await adminClient()
    .from("pending_role_assignments")
    .upsert({ email, role, invited_by: invitedBy }, { onConflict: "email,role" });
  if (error) throw new Error(`The invitation could not be saved: ${error.message}`);
  return { applied: false };
}

export async function cancelInvite(id: string) {
  const { error } = await adminClient()
    .from("pending_role_assignments")
    .delete()
    .eq("id", id);
  if (error) throw new Error(`The invitation could not be withdrawn: ${error.message}`);
}

/**
 * Drain any invitations for this address and turn them into real assignments.
 * Called from the OAuth callback once the profile row exists — role_assignments
 * has a foreign key onto profiles, so the order matters.
 */
export async function applyPendingRoleAssignments(userId: string, email?: string) {
  const address = normalizeEmail(email ?? "");
  if (!address) return [];

  const client = adminClient();
  const { data: pending, error } = await client
    .from("pending_role_assignments")
    .select("id, role")
    .eq("email", address);
  if (error) throw new Error(`Invited roles could not be read: ${error.message}`);
  if (!pending?.length) return [];

  const { error: grantError } = await client
    .from("role_assignments")
    .upsert(
      pending.map((row) => ({ profile_id: userId, role: row.role })),
      { onConflict: "profile_id,role" },
    );
  if (grantError)
    throw new Error(`Invited roles could not be applied: ${grantError.message}`);

  await client
    .from("pending_role_assignments")
    .delete()
    .in("id", pending.map((row) => row.id));

  return pending.map((row) => row.role as UserRole);
}
