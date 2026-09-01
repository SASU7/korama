"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SyncBadge } from "@/components/shared/sync-badge";
import { useWorkspaceLive } from "@/components/workspace/workspace-live-provider";

export function WorkspaceHeader() {
  const { syncStatus, refresh, busy } = useWorkspaceLive();
  return (
    <div className="ml-auto flex items-center gap-3">
      <SyncBadge status={syncStatus} />
      <Button
        size="sm"
        variant="ghost"
        disabled={busy}
        onClick={() => void refresh()}
      >
        <RefreshCw className="size-3.5" aria-hidden />
        Refresh
      </Button>
    </div>
  );
}
