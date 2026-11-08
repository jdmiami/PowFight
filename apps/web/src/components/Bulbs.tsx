export function Bulbs({ count = 24, chase = false, className = '' }: { count?: number; chase?: boolean; className?: string }) {
  return (
    <div className={`bulbs ${chase ? 'bulbs-chase' : ''} ${className}`} aria-hidden>
      {Array.from({ length: count }, (_, i) => <span key={i} className="bulb" style={{ ['--i' as string]: i }} />)}
    </div>
  );
}
