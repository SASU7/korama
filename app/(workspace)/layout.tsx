import { cookies } from "next/headers";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import { WorkspaceLiveProvider } from "@/components/workspace/workspace-live-provider";
import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import { requireStaff } from "@/lib/auth-guards";
import { readNormalizedState } from "@/lib/supabase/normalized-adapter";

export const dynamic = "force-dynamic";

/**
 * Staff console shell. `data-density="compact"` sits on the wrapper rather
 * than <body> so the compact: variant — &:is([data-density="compact"] *) —
 * matches everything inside without touching the storefront.
 *
 * This layout gates "signed in and holds some staff role". Each page
 * additionally asserts its own role, because a layout is not a security
 * boundary on its own.
 */
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireStaff();
  const state = await readNormalizedState(auth.user.id, auth.activeRole);
  const sidebarOpen =
    (await cookies()).get("sidebar_state")?.value !== "false";

  return (
    <div data-density="compact">
      <SidebarProvider defaultOpen={sidebarOpen}>
        <WorkspaceSidebar roles={auth.roles} activeRole={auth.activeRole} />
        <SidebarInset>
          <WorkspaceLiveProvider initialState={state} authenticated>
            <header className="bg-background/95 sticky top-0 z-30 flex h-12 items-center gap-2 border-b px-(--gutter) backdrop-blur">
              <SidebarTrigger />
              <Separator orientation="vertical" className="mr-1 h-4" />
              <WorkspaceHeader />
            </header>
            <div className="flex-1 px-(--gutter) py-(--gutter)">{children}</div>
          </WorkspaceLiveProvider>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
