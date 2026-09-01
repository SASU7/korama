"use client";

import * as React from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/**
 * navigator.onLine is an external store, so useSyncExternalStore is the right
 * primitive. The server snapshot is `true`: assuming online avoids rendering
 * an offline banner into the HTML of every page.
 */
export function useOnlineStatus() {
  return React.useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}
