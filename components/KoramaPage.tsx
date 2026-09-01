import PrototypeWorkspace from "@/components/PrototypeWorkspace";
import { authContext } from "@/lib/auth";
import { readNormalizedState } from "@/lib/supabase/normalized-adapter";

/**
 * Transitional: the storefront still renders from the legacy workspace
 * component. Deleted when /shop is rebuilt in the catalogue phase.
 * The staff surfaces no longer come through here — they read the shared
 * WorkspaceLiveProvider in the (workspace) group layout.
 */
export default async function KoramaPage() {
  const auth = await authContext();
  const state = await readNormalizedState(auth?.user.id, "consumer");
  return (
    <PrototypeWorkspace
      initialState={state}
      initialSurface="shop"
      authenticated={Boolean(auth)}
    />
  );
}
