import { redirect } from "next/navigation";
import PrototypeWorkspace, { type Surface } from "@/components/PrototypeWorkspace";
import { authContext } from "@/lib/auth";
import type { UserRole } from "@/lib/domain";
import { readNormalizedState } from "@/lib/supabase/normalized-adapter";

export default async function KoramaPage({ surface, requiredRole }: { surface: Surface; requiredRole?: UserRole }) {
  const auth = await authContext();
  if (requiredRole && !auth) redirect(`/auth/sign-in?next=/${surface}`);
  if (requiredRole && auth && !auth.roles.includes(requiredRole)) redirect("/shop?access=denied");
  const activeRole = requiredRole ?? "consumer";
  const state = await readNormalizedState(auth?.user.id, activeRole);
  return <PrototypeWorkspace
    initialState={state}
    initialSurface={surface}
    initialRole={activeRole}
    assignedRoles={auth?.roles ?? []}
    authenticated={Boolean(auth)}
    displayName={auth?.user.user_metadata?.full_name || auth?.user.user_metadata?.name || auth?.user.email}
  />;
}
