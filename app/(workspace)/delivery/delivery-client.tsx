"use client";

import {
  DeliverySurface,
  DeliveryCompletionButton,
} from "@/components/PrototypeWorkspace";
import { useWorkspaceLive } from "@/components/workspace/workspace-live-provider";
import { SurfaceShell } from "@/components/workspace/surface-shell";

export function DeliveryClient() {
  const { state, run, busy, error, refresh } = useWorkspaceLive();
  return (
    <SurfaceShell error={error} busy={busy} onRetry={refresh}>
      <DeliverySurface state={state} mutate={run} busy={busy} />
      <DeliveryCompletionButton state={state} mutate={run} busy={busy} />
    </SurfaceShell>
  );
}
