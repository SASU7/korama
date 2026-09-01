export default function Loading() {
  return (
    <main className="gate-page" aria-busy="true">
      <section className="gate-card">
        <div className="brand-lockup">
          <span className="brand-mark">K</span>
          <span>KORAMA</span>
        </div>
        <p className="eyebrow loading-eyebrow">Loading Korama</p>
        <div className="loading-skeleton" aria-hidden="true" />
      </section>
    </main>
  );
}
