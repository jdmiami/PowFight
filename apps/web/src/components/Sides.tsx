'use client';
import { Playbill } from './Playbill';
import { SpellingToggle, Verse, useModernSpelling } from './ScriptText';
import type { Line } from '@/lib/types';

/** The audition sides on paper: cue, verse, hairlines, spelling toggle. */
export function Sides({ sides, characterName, kicker = 'The sides', note }: { sides: Line[]; characterName: string; kicker?: string; note?: string }) {
  const [modern, setModern] = useModernSpelling();
  return (
    <Playbill kicker={kicker} title={characterName}>
      {note && <p className="t-caption text-paper-ink-2 -mt-2 mb-4">{note}</p>}
      <ol>
        {sides.map((s, i) => (
          <li key={s.id} className={`py-4 ${i > 0 ? 'hairline' : 'pt-0'}`}>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="t-cue text-paper-ink-2">{characterName}</span>
              <span className="t-caption text-paper-ink-2 tabular-nums">Side {i + 1} · ~{s.estSeconds}s</span>
            </div>
            <Verse text={s.text} modern={modern} className="text-paper-ink" />
          </li>
        ))}
      </ol>
      <div className="hairline pt-3 mt-1 flex justify-end"><SpellingToggle modern={modern} onChange={setModern} /></div>
    </Playbill>
  );
}
