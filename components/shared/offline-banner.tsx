"use client";

import { useRouter } from "next/navigation";
import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/components/shared/use-online-status";

/**
 * Mounted in the root layout, so checkout and sign-in get it too — previously
 * only the workspace surfaces warned about being offline.
 */
export function OfflineBanner() {
  const online = useOnlineStatus();
  const router = useRouter();
  if (online) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-50 flex items-center justify-center gap-3 border-b bg-warning/15 px-4 py-2 text-(length:--text-meta)"
    >
      <CircleAlert className="size-4 shrink-0" aria-hidden />
      <span>You&rsquo;re offline. Changes are paused until the connection returns.</span>
      <Button size="sm" variant="ghost" onClick={() => router.refresh()}>
        Retry
      </Button>
    </div>
  );
}
