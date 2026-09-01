"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <main className="gate-page">
      <section className="gate-card">
        <p className="eyebrow">Korama</p>
        <h1>Something went wrong.</h1>
        <p className="gate-copy">
          Try the page again; no payment or
          fulfilment state is changed by this action.
        </p>
        <button className="primary-button" type="button" onClick={reset}>
          Try again
        </button>
      </section>
    </main>
  );
}
