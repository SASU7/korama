import type { UserRole } from "@/lib/domain";

/**
 * Shapes the People screen renders. Split out of lib/supabase/role-admin.ts
 * the way catalogue-types.ts is split out of catalogue-admin.ts: that module
 * is `server-only` and holds the service-role client, so a client component
 * must not reach into it even for a type.
 */
export type AdminUserRow = {
  id: string;
  email: string;
  displayName: string;
  /** Rows in role_assignments. Administrators act as more than this. */
  roles: UserRole[];
  createdAt: string;
  lastSignInAt: string | null;
};

export type PendingInviteRow = {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
};
