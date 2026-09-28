export default function Loading() {
  return (
    <div
      className="container section"
      aria-label="Carregando conteúdo"
      role="status"
    >
      <div className="skeleton skeleton-title" />
      <div className="vehicle-grid">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton skeleton-card" />
        ))}
      </div>
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
