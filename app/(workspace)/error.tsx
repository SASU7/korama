"use client";

import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WorkspaceError({ reset }: { reset: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-6">
      <CircleAlert className="text-muted-foreground size-5" aria-hidden />
      <p className="font-medium">This surface didn&rsquo;t load.</p>
      <p className="text-muted-foreground text-(length:--text-meta)">
        No order, inventory or sortie state was changed.
      </p>
      <Button size="sm" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
