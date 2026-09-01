"use server";

import { revalidatePath } from "next/cache";
import { requireAdministrator } from "@/lib/auth-guards-admin";
import { ROLE_LABELS } from "@/lib/navigation";
import {
  cancelInvite,
  countAdministrators,
  gmailAddressError,
  grantRole,
  inviteRole,
  isAssignableRole,
  listUserAccounts,
  normalizeEmail,
  revokeRole,
} from "@/lib/supabase/role-admin";
import type { UserRole } from "@/lib/domain";

export type RoleActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

function failure(error: unknown, fallback: string): RoleActionResult {
  return { ok: false, error: error instanceof Error ? error.message : fallback };
}

function requestedRoles(form: FormData) {
  return form.getAll("roles").map(String).filter(isAssignableRole);
}

/**
 * Apply one account's role checkboxes. The form posts the roles that should be
 * held, and the diff against what is held now decides the grants and revokes —
 * so a stale form cannot silently re-grant a role another administrator has
 * just removed by only sending the boxes that changed.
 */
export async function saveUserRolesAction(
  _previous: RoleActionResult | null,
  form: FormData,
): Promise<RoleActionResult> {
  const auth = await requireAdministrator();
  const profileId = String(form.get("profileId") ?? "");
  if (!profileId) return { ok: false, error: "That account could not be found" };

  try {
    const accounts = await listUserAccounts();
    const account = accounts.find((candidate) => candidate.id === profileId);
    if (!account) return { ok: false, error: "That account could not be found" };

    const wanted = new Set<UserRole>(requestedRoles(form));
    const held = new Set(account.roles.filter(isAssignableRole));
    const granted = [...wanted].filter((role) => !held.has(role));
    const revoked = [...held].filter((role) => !wanted.has(role));
    if (!granted.length && !revoked.length)
      return { ok: true, message: "No changes to save" };

    if (revoked.includes("administrator")) {
      // Two ways to lock everyone out of this page, both blocked here rather
      // than in the client so a crafted POST hits the same wall.
      if (profileId === auth.user.id)
        return {
          ok: false,
          error:
            "You can't remove your own administrator role. Ask another administrator to do it.",
        };
      if ((await countAdministrators()) <= 1)
        return {
          ok: false,
          error: "This is the last administrator — grant the role to someone else first.",
        };
    }

    for (const role of granted) await grantRole(profileId, role);
    for (const role of revoked) await revokeRole(profileId, role);

    revalidatePath("/admin/users");
    const describe = (roles: UserRole[]) =>
      roles.map((role) => ROLE_LABELS[role].toLowerCase()).join(", ");
    return {
      ok: true,
      message: [
        granted.length ? `Granted ${describe(granted)}` : "",
        revoked.length ? `Removed ${describe(revoked)}` : "",
      ]
        .filter(Boolean)
        .join(" · "),
    };
  } catch (error) {
    return failure(error, "The roles could not be saved");
  }
}

export async function inviteRoleAction(
  _previous: RoleActionResult | null,
  form: FormData,
): Promise<RoleActionResult> {
  const auth = await requireAdministrator();
  const email = normalizeEmail(String(form.get("email") ?? ""));
  const role = String(form.get("role") ?? "");

  const emailError = gmailAddressError(email);
  if (emailError) return { ok: false, error: emailError };
  if (!isAssignableRole(role)) return { ok: false, error: "Choose a role to assign" };

  try {
    const { applied } = await inviteRole(email, role, auth.user.id);
    revalidatePath("/admin/users");
    return {
      ok: true,
      message: applied
        ? `${email} already has an account — ${ROLE_LABELS[role].toLowerCase()} granted now.`
        : `${email} will hold ${ROLE_LABELS[role].toLowerCase()} from their first sign-in.`,
    };
  } catch (error) {
    return failure(error, "The invitation could not be saved");
  }
}

export async function cancelInviteAction(form: FormData) {
  await requireAdministrator();
  const id = String(form.get("id") ?? "");
  if (!id) return;
  await cancelInvite(id);
  revalidatePath("/admin/users");
}
