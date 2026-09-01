"use client";

import { OperationsSurface } from "@/components/PrototypeWorkspace";
import { useWorkspaceLive } from "@/components/workspace/workspace-live-provider";
import { SurfaceShell } from "@/components/workspace/surface-shell";

export function OperationsClient() {
  const { state, run, busy, error, refresh } = useWorkspaceLive();
  return (
    <SurfaceShell error={error} busy={busy} onRetry={refresh}>
      <OperationsSurface state={state} mutate={run} busy={busy} />
    </SurfaceShell>
  );
}
