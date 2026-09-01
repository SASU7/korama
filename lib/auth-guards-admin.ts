import "server-only";

import { redirect } from "next/navigation";
import { authContext, type AuthContext } from "@/lib/auth";

/**
 * Catalogue ownership. Separate from requireSurfaceRole because the admin
 * area is not one of the three demo surfaces and does not belong in the
 * access-denied copy that names them.
 */
export async function requireAdministrator(next = "/admin/products"): Promise<AuthContext> {
  const auth = await authContext();
  if (!auth) redirect(`/auth/sign-in?next=${encodeURIComponent(next)}`);
  if (!auth.roles.includes("administrator")) redirect("/access-denied?surface=admin");
  return auth;
}
