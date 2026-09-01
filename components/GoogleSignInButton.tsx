"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function GoogleSignInButton({ next = "/shop" }: { next?: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    setError("");
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set(
      "next",
      next.startsWith("/") && !next.startsWith("//") ? next : "/shop",
    );
    const { error: authError } = await createSupabaseBrowserClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback.toString() },
    });
    if (authError) {
      setError(authError.message);
      setBusy(false);
    }
  }

  return <>
    <button type="button" className="google-button" onClick={signIn} disabled={busy}>
      <span className="google-g" aria-hidden="true">G</span>{busy ? "Opening Google…" : "Continue with Google"}
    </button>
    {error && <p className="auth-error" role="alert">{error}</p>}
  </>;
}
