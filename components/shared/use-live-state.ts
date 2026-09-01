"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { SyncStatus } from "@/components/shared/sync-badge";
import { useOnlineStatus } from "@/components/shared/use-online-status";

/**
 * The live-data mechanism, extracted from the single 2000-line client
 * component so the storefront and the staff console can each subscribe to
 * only what they need.
 *
 * Three sources feed one piece of state:
 *  - the server-rendered `initial` value,
 *  - a 10s poll, and
 *  - a Supabase Realtime private channel on order_events / sortie_events.
 *
 * The channel name is load-bearing: the RLS policy in
 * 20260830115932_realtime_authorization.sql matches
 * `realtime.topic() = 'korama-private-events'` literally.
 */
const CHANNEL = "korama-private-events";
const POLL_MS = 10_000;

async function readApiBody(response: Response) {
  const text = await response.text();
  if (!text) return {} as { error?: string };
  try {
    return JSON.parse(text) as { error?: string };
  } catch {
    return { error: "The server returned an unreadable response" };
  }
}

export function useLiveState<T>({
  initial,
  endpoint,
  select,
  authenticated,
  version,
}: {
  initial: T;
  endpoint: string;
  /** Pull the payload out of the endpoint's response body. */
  select: (body: unknown) => T;
  authenticated: boolean;
  /**
   * A value that changes whenever the server re-rendered with fresh data
   * (we use DemoState.lastMutation). Without this, a router.refresh() after a
   * server mutation is silently clobbered by the stale client copy — a bug
   * the original single-component design could not have, because it never
   * re-rendered from the server at all.
   */
  version?: string;
}) {
  const [data, setData] = useState<T>(initial);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("local");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const online = useOnlineStatus();

  // "Adjusting state when a prop changes": the server sent a newer snapshot
  // than we hold, so drop the client copy. Held in state rather than a ref
  // because refs cannot be read during render.
  const [seenVersion, setSeenVersion] = useState(version);
  if (version !== undefined && version !== seenVersion) {
    setSeenVersion(version);
    setData(initial);
  }

  const refresh = useCallback(async () => {
    const response = await fetch(endpoint, { cache: "no-store" });
    if (!response.ok) throw new Error("Couldn't refresh the application data");
    setData(select(await response.json()));
  }, [endpoint, select]);

  useEffect(() => {
    const client = authenticated ? createSupabaseBrowserClient() : null;
    const poll = window.setInterval(() => {
      setSyncStatus((status) => (status === "realtime" ? status : "polling"));
      void refresh().catch(() =>
        setError("Live state is unavailable. Try refresh."),
      );
    }, POLL_MS);
    if (!client) return () => window.clearInterval(poll);

    const channel = client
      .channel(CHANNEL, { config: { private: true } })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_events" },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sortie_events" },
        () => void refresh(),
      )
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") setSyncStatus("realtime");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT")
          setSyncStatus("polling");
      });

    return () => {
      window.clearInterval(poll);
      void client.removeChannel(channel);
    };
  }, [authenticated, refresh]);

  /** Offline-aware POST, then refresh. Replaces the old `mutate()`. */
  const run = useCallback(
    async (url: string, init?: RequestInit, success?: string) => {
      if (!navigator.onLine) {
        setError("You are offline. Reconnect before making changes.");
        return;
      }
      setBusy(true);
      setError("");
      try {
        const response = await fetch(url, init);
        const body = await readApiBody(response);
        if (!response.ok) throw new Error(body.error ?? "The action failed");
        await refresh();
        if (success) {
          const { toast } = await import("sonner");
          toast.success(success);
        }
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : "The action failed",
        );
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  return {
    data,
    syncStatus,
    online,
    error,
    busy,
    refresh,
    run,
    clearError: useCallback(() => setError(""), []),
  };
}
