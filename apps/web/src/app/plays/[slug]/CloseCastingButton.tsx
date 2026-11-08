'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function CloseCastingButton({ productionId }: { productionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button disabled={busy} className="btn-ghost text-sm h-10 min-h-0" onClick={async () => {
      if (!confirm('Close auditions now, crown the winners and fund the prize pools?')) return;
      setBusy(true);
      await fetch(`/api/productions/${productionId}/close`, { method: 'POST' });
      setBusy(false); router.refresh();
    }}>{busy ? 'Closing…' : 'Close casting (admin)'}</button>
  );
}
