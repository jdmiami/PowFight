export function Playbill({ title, kicker, children, className = '' }: { title?: string; kicker?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`playbill ${className}`}>
      <div className="playbill-rule" />
      {(kicker || title) && (
        <header className="mb-4">
          {kicker && <p className="t-label text-paper-ink-2">{kicker}</p>}
          {title && <h2 className="t-title-sm text-paper-ink mt-0.5" style={{ fontVariant: 'small-caps', letterSpacing: '.04em' }}>{title}</h2>}
        </header>
      )}
      <div className="relative">{children}</div>
    </section>
  );
}
