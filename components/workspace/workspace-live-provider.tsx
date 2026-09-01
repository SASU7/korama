"use client";

import { createContext, useContext } from "react";
import { useLiveState } from "@/components/shared/use-live-state";
import type { SyncStatus } from "@/components/shared/sync-badge";
import type { DemoState } from "@/lib/domain";

type WorkspaceLive = {
  state: DemoState;
  syncStatus: SyncStatus;
  online: boolean;
  error: string;
  busy: boolean;
  refresh: () => Promise<void>;
  run: (url: string, init?: RequestInit, success?: string) => Promise<void>;
  clearError: () => void;
};

const Ctx = createContext<WorkspaceLive | null>(null);

const selectState = (body: unknown) => (body as { state: DemoState }).state;

/**
 * One subscription for all three staff surfaces, mounted in the group layout.
 * Previously each surface shared a single 2000-line component; now they are
 * separate routes that would otherwise each open their own Realtime channel.
 */
export function WorkspaceLiveProvider({
  initialState,
  authenticated,
  children,
}: {
  initialState: DemoState;
  authenticated: boolean;
  children: React.ReactNode;
}) {
  const live = useLiveState<DemoState>({
    initial: initialState,
    endpoint: "/api/app/state",
    select: selectState,
    authenticated,
    version: initialState.lastMutation,
  });

  return (
    <Ctx.Provider
      value={{
        state: live.data,
        syncStatus: live.syncStatus,
        online: live.online,
        error: live.error,
        busy: live.busy,
        refresh: live.refresh,
        run: live.run,
        clearError: live.clearError,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useWorkspaceLive(): WorkspaceLive {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error("useWorkspaceLive must be used inside WorkspaceLiveProvider");
  return ctx;
}
