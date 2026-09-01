"use client";

import { CircleAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * Shared error/busy frame for a workspace surface. Success feedback goes to
 * a toast; only blocking failures stay on the page, where they can be retried.
 */
export function SurfaceShell({
  error,
  busy,
  onRetry,
  children,
}: {
  error: string;
  busy: boolean;
  onRetry: () => Promise<void> | void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-(--gutter)" aria-busy={busy}>
      {error && (
        <Alert variant="destructive" role="alert">
          <CircleAlert />
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={() => void onRetry()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {children}
    </div>
  );
}
