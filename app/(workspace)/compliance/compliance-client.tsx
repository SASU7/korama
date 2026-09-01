"use client";

import { ComplianceSurface } from "@/components/PrototypeWorkspace";
import { useWorkspaceLive } from "@/components/workspace/workspace-live-provider";
import { SurfaceShell } from "@/components/workspace/surface-shell";

export function ComplianceClient() {
  const { state, run, busy, error, refresh } = useWorkspaceLive();
  return (
    <SurfaceShell error={error} busy={busy} onRetry={refresh}>
      <ComplianceSurface state={state} />
    </SurfaceShell>
  );
}
