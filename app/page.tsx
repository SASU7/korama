"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, CircleAlert, LockKeyhole, ShieldCheck } from "lucide-react";
import PrototypeWorkspace from "@/components/PrototypeWorkspace";
import { UserRole } from "@/lib/domain";

export default function HomePage() {
  const [code, setCode] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionRole, setSessionRole] = useState<UserRole>("consumer");

  useEffect(() => {
    fetch("/api/demo/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((body: { authenticated?: boolean; role?: UserRole | null }) => { setUnlocked(Boolean(body.authenticated)); if (body.role) setSessionRole(body.role); setCheckingSession(false); })
      .catch(() => setCheckingSession(false));
  }, []);

  async function unlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const response = await fetch("/api/demo/access", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) });
      if (!response.ok) throw new Error("That code didn’t match. Ask the presenter for the shared demo code.");
      setUnlocked(true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Access could not be verified"); }
  }

  if (checkingSession || !unlocked) {
    return (
      <main className="gate-page">
        <div className="gate-glow" aria-hidden="true" />
        <section className="gate-card" aria-labelledby="gate-title">
          <div className="brand-lockup"><span className="brand-mark">K</span><span>KORAMA</span></div>
          <div className="gate-icon"><LockKeyhole size={20} aria-hidden="true" /></div>
          <p className="eyebrow">Private investor prototype</p>
          <h1 id="gate-title">A trade corridor built both ways.</h1>
          <p className="gate-copy">Explore the Ghana–Nigeria commerce, fulfilment, and delivery journey in a guided demo environment.</p>
          <form onSubmit={unlock} className="access-form" noValidate>
            <label htmlFor="demo-code">Demo access code</label>
            <div className="input-row">
              <input id="demo-code" name="demo-code" type="text" autoComplete="one-time-code" value={code} onChange={(event) => { setCode(event.target.value); setError(""); }} placeholder="Enter shared code" aria-invalid={Boolean(error)} aria-describedby={error ? "code-error" : "code-help"} />
              <button type="submit" className="primary-button">Enter demo <ArrowUpRight size={17} aria-hidden="true" /></button>
            </div>
            <p id="code-help" className="helper-text">The code protects this deployed prototype. No password is stored here.</p>
            {error && <p id="code-error" className="form-error" role="alert"><CircleAlert size={15} aria-hidden="true" />{error}</p>}
          </form>
          <div className="gate-footer"><ShieldCheck size={15} aria-hidden="true" /> Illustrative data · No live transactions</div>
        </section>
      </main>
    );
  }

  return <PrototypeWorkspace initialRole={sessionRole} />;
}
