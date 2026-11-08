/**
 * In-memory data source used when no Supabase project is configured.
 * Seeds Romeo and Juliet from the parsed Gutenberg text plus a few fake auditions so every
 * screen has something to show. State resets when the server restarts.
 */
import type { ParsedScript } from '@playhouse/script-parser';
import { pickSides, estimateSeconds, slugify } from '@playhouse/script-parser';
import type { Audition, CastMember, Character, Clip, FeedItem, FilmQueueItem, Line, Production, Profile, Script } from '../types';
import type { DataSource } from './index';
import romeo from '../../../../../content/romeo-and-juliet.json';

const now = () => new Date().toISOString();

export const DEMO_USER: Profile = { id: 'demo-you', handle: 'you', displayName: 'You (demo)', storytellerUntil: null };

interface Store {
  counter: number;
  seeded: boolean;
  profiles: Map<string, Profile>;
  scripts: Map<string, Script>;
  productions: Map<string, Production>;
  auditions: Map<string, Audition>;
  clips: Map<string, Clip>;
  votes: Map<string, string>; // `${voter}|${production}|${character}` -> auditionId
  cast: Map<string, CastMember[]>;
  ledger: Array<{ userId?: string; cents: number }>;
  sidesByCharacter: Map<string, Line[]>;
}

// Next.js bundles each route separately, so module state would be duplicated per route.
// Pin the demo store to globalThis so pages and API routes share one in-process world.
const g = globalThis as unknown as { __playhouseDemo?: Store };
const store: Store = (g.__playhouseDemo ??= {
  counter: 0, seeded: false,
  profiles: new Map<string, Profile>([
    [DEMO_USER.id, DEMO_USER],
    ['u-ana', { id: 'u-ana', handle: 'ana_acts', displayName: 'Ana Reyes' }],
    ['u-marcus', { id: 'u-marcus', handle: 'marcusonstage', displayName: 'Marcus Lee' }],
    ['u-pri', { id: 'u-pri', handle: 'priya.p', displayName: 'Priya Patel' }],
    ['u-jo', { id: 'u-jo', handle: 'jo_theatre', displayName: 'Jo Okafor' }],
  ]),
  scripts: new Map(), productions: new Map(), auditions: new Map(), clips: new Map(), votes: new Map(), cast: new Map(), ledger: [], sidesByCharacter: new Map(),
});
const { profiles, scripts, productions, auditions, clips, votes, cast, ledger, sidesByCharacter } = store;
const uid = () => `d${(++store.counter).toString(36)}`;

function scriptFromParsed(parsed: ParsedScript, ownerId: string): Script {
  const id = uid();
  const chars: Character[] = parsed.characters.map((c) => ({ id: `${id}-${c.id}`, key: c.id, name: c.name, aliases: c.aliases, lineCount: c.lineCount, wordCount: c.wordCount }));
  const charByKey = new Map(chars.map((c) => [c.key, c]));
  const lines: Line[] = parsed.lines.map((l) => ({
    id: `${id}-${l.id}`, idx: l.index, sceneIdx: l.sceneIndex, sceneTitle: parsed.scenes[l.sceneIndex]?.title,
    type: l.type, characterId: l.characterId ? charByKey.get(l.characterId)?.id : null, text: l.text, estSeconds: estimateSeconds(l.text),
  }));
  for (const c of chars) {
    const sides = pickSides(parsed, c.key, 3).map((s) => lines[s.index]);
    sidesByCharacter.set(c.id, sides);
  }
  const script: Script = { id, slug: slugify(parsed.title), title: parsed.title, author: parsed.author, source: parsed.source, license: parsed.license, status: 'published', ownerId, characters: chars, lines };
  scripts.set(id, script);
  return script;
}

// ---- seed -------------------------------------------------------------------------------
if (!store.seeded) {
  store.seeded = true;
  const rj = scriptFromParsed(romeo as unknown as ParsedScript, 'u-jo');
  const closeAt = new Date(Date.now() + 6 * 86400_000).toISOString();
  const prod: Production = { id: 'p-rj', scriptId: rj.id, slug: 'romeo-and-juliet', title: 'Romeo and Juliet', status: 'casting', entryFeeCents: 1200, houseFeeCents: 200, auditionsCloseAt: closeAt };
  productions.set(prod.id, prod);

  function seedAudition(characterKey: string, actorId: string, voteCount: number, media: string) {
    const ch = rj.characters.find((c) => c.key === characterKey)!;
    const a: Audition = { id: uid(), productionId: prod.id, characterId: ch.id, actorId, actor: profiles.get(actorId)!, status: 'submitted', voteCount, submittedAt: now(), createdAt: now(), stitchedUrl: `/demo/${media}.mp4`, posterUrl: `/demo/${media}.jpg` };
    auditions.set(a.id, a);
    for (const side of sidesByCharacter.get(ch.id) ?? []) {
      const c: Clip = { id: uid(), ownerId: actorId, productionId: prod.id, lineId: side.id, auditionId: a.id, purpose: 'audition', storagePath: `demo/${a.id}/${side.id}.webm`, moderation: 'approved' };
      clips.set(c.id, c);
    }
  }
  seedAudition('juliet', 'u-ana', 15, 'ana-juliet');
  seedAudition('romeo', 'u-marcus', 12, 'marcus-romeo');
  seedAudition('juliet', 'u-pri', 9, 'priya-juliet');
  seedAudition('romeo', 'u-jo', 7, 'jo-romeo');
  seedAudition('nurse', 'u-pri', 4, 'priya-nurse');
  seedAudition('mercutio', 'u-marcus', 3, 'marcus-mercutio');
}

// ---- helpers ------------------------------------------------------------------------------
function withActor(a: Audition): Audition { return { ...a, actor: profiles.get(a.actorId) ?? a.actor }; }
function scriptOf(productionId: string) { const p = productions.get(productionId); return p ? scripts.get(p.scriptId) : undefined; }

export const demoData: DataSource = {
  async listProductions() {
    return [...productions.values()].map((p) => ({ ...p, scriptTitle: scripts.get(p.scriptId)!.title, author: scripts.get(p.scriptId)!.author }));
  },
  async listFeed(opts = {}) {
    const items: FeedItem[] = [];
    for (const p of productions.values()) {
      if (opts.productionId && p.id !== opts.productionId) continue;
      const s = scripts.get(p.scriptId)!;
      for (const ch of s.characters) {
        if (opts.characterId && ch.id !== opts.characterId) continue;
        const entries = [...auditions.values()].filter((a) => a.productionId === p.id && a.characterId === ch.id && ['submitted', 'won', 'lost'].includes(a.status)).sort((a, b) => b.voteCount - a.voteCount || (a.submittedAt ?? '').localeCompare(b.submittedAt ?? ''));
        entries.forEach((a, i) => {
          const sides = sidesByCharacter.get(ch.id) ?? [];
          const paths = sides.map((side) => [...clips.values()].find((c) => c.auditionId === a.id && c.lineId === side.id)?.storagePath).filter((x): x is string => Boolean(x));
          items.push({ audition: withActor(a), character: { id: ch.id, key: ch.key, name: ch.name, lineCount: ch.lineCount }, production: { id: p.id, slug: p.slug, title: p.title, status: p.status, auditionsCloseAt: p.auditionsCloseAt, entryFeeCents: p.entryFeeCents, houseFeeCents: p.houseFeeCents }, clipPaths: paths, rank: i + 1, entrants: entries.length, caption: sides[0]?.text });
        });
      }
    }
    // Interleave: round-robin across roles so two reels for the same role sit apart, best-ranked first.
    const byRole = new Map<string, FeedItem[]>();
    for (const it of items) { const k = it.character.id; (byRole.get(k) ?? byRole.set(k, []).get(k)!).push(it); }
    const out: FeedItem[] = [];
    let added = true;
    while (added) { added = false; for (const q of byRole.values()) { const it = q.shift(); if (it) { out.push(it); added = true; } } }
    return out.slice(0, opts.limit ?? 50);
  },
  async productionProgress(productionId) {
    const s = scriptOf(productionId); if (!s) return { filmed: 0, total: 0, castSize: 0, rolesTotal: 0 };
    const dialogue = s.lines.filter((l) => l.type === 'dialogue');
    const filmedIds = new Set([...clips.values()].filter((c) => c.productionId === productionId && c.purpose === 'performance').map((c) => c.lineId));
    return { filmed: dialogue.filter((l) => filmedIds.has(l.id)).length, total: dialogue.length, castSize: (cast.get(productionId) ?? []).length, rolesTotal: s.characters.length };
  },
  async getProductionBySlug(slug) {
    const production = [...productions.values()].find((p) => p.slug === slug);
    if (!production) return null;
    return { production, script: scripts.get(production.scriptId)! };
  },
  async getRoleBoard(productionId) {
    const s = scriptOf(productionId); if (!s) return [];
    return s.characters.map((character) => {
      const entries = [...auditions.values()].filter((a) => a.productionId === productionId && a.characterId === character.id && ['submitted', 'won', 'lost'].includes(a.status));
      const leader = entries.sort((a, b) => b.voteCount - a.voteCount)[0];
      return { character, entrants: entries.length, leader: leader ? withActor(leader) : undefined, sides: sidesByCharacter.get(character.id) ?? [] };
    });
  },
  async getRole(productionId, characterKey) {
    const s = scriptOf(productionId); const character = s?.characters.find((c) => c.key === characterKey);
    if (!character) return null;
    return { character, sides: sidesByCharacter.get(character.id) ?? [] };
  },
  async listAuditions(productionId, characterId) {
    return [...auditions.values()].filter((a) => a.productionId === productionId && a.characterId === characterId && ['submitted', 'won', 'lost'].includes(a.status)).sort((a, b) => b.voteCount - a.voteCount).map(withActor);
  },
  async getAudition(id) {
    const a = auditions.get(id); if (!a) return null;
    return { ...withActor(a), clips: [...clips.values()].filter((c) => c.auditionId === id), sides: sidesByCharacter.get(a.characterId) ?? [] };
  },
  async getMyVotes(productionId, voterId) {
    const out: Record<string, string> = {};
    for (const [k, v] of votes) { const [voter, p, ch] = k.split('|'); if (voter === voterId && p === productionId) out[ch] = v; }
    return out;
  },
  async getCast(productionId) { return cast.get(productionId) ?? []; },
  async myAuditions(actorId) {
    return [...auditions.values()].filter((a) => a.actorId === actorId).map((a) => {
      const p = productions.get(a.productionId)!; const ch = scripts.get(p.scriptId)!.characters.find((c) => c.id === a.characterId)!;
      return { ...withActor(a), productionTitle: p.title, productionSlug: p.slug, characterName: ch.name, characterKey: ch.key };
    });
  },
  async myLinesToFilm(productionId, actorId) {
    const s = scriptOf(productionId); if (!s) return [];
    const mine = (cast.get(productionId) ?? []).filter((c) => c.actorId === actorId).map((c) => c.characterId);
    const out: FilmQueueItem[] = [];
    s.lines.forEach((line, i) => {
      if (!(line.type === 'dialogue' && line.characterId && mine.includes(line.characterId))) return;
      let cue: FilmQueueItem['cue'];
      for (let j = i - 1; j >= 0; j--) {
        const prev = s.lines[j];
        if (prev.type === 'heading') { cue = { kind: 'heading', text: prev.text }; break; }
        if (prev.type === 'dialogue' && prev.characterId !== line.characterId) { cue = { kind: 'line', speaker: s.characters.find((c) => c.id === prev.characterId)?.name ?? 'Someone', text: prev.text }; break; }
      }
      out.push({ line, character: s.characters.find((c) => c.id === line.characterId)!, cue,
        clip: [...clips.values()].find((c) => c.productionId === productionId && c.lineId === line.id && c.purpose === 'performance') });
    });
    return out;
  },
  async getProfile(id) { return profiles.get(id) ?? null; },
  async myBalanceCents(userId) { return ledger.filter((l) => l.userId === userId).reduce((s, l) => s + l.cents, 0); },

  async createAudition(productionId, characterId, actorId) {
    const existing = [...auditions.values()].find((a) => a.productionId === productionId && a.characterId === characterId && a.actorId === actorId);
    if (existing) return withActor(existing);
    const a: Audition = { id: uid(), productionId, characterId, actorId, actor: profiles.get(actorId)!, status: 'pending_payment', voteCount: 0, createdAt: now() };
    auditions.set(a.id, a); return a;
  },
  async markAuditionPaid(auditionId, _ref, paidCents) {
    const a = auditions.get(auditionId); if (!a) return;
    a.status = 'draft'; ledger.push({ userId: a.actorId, cents: -paidCents });
  },
  async addClip(input) { const c: Clip = { ...input, id: uid(), moderation: 'approved' }; clips.set(c.id, c); return c; },
  async submitAudition(auditionId, actorId) {
    const a = auditions.get(auditionId); if (!a || a.actorId !== actorId) throw new Error('not yours');
    a.status = 'submitted'; a.submittedAt = now();
  },
  async vote(auditionId, voterId) {
    const a = auditions.get(auditionId); if (!a) throw new Error('no audition');
    if (a.actorId === voterId) throw new Error('You cannot vote for yourself');
    const key = `${voterId}|${a.productionId}|${a.characterId}`;
    const prev = votes.get(key); if (prev === auditionId) return;
    if (prev) { const pa = auditions.get(prev); if (pa) pa.voteCount--; }
    votes.set(key, auditionId); a.voteCount++;
  },
  async unvote(productionId, characterId, voterId) {
    const key = `${voterId}|${productionId}|${characterId}`; const prev = votes.get(key);
    if (prev) { const pa = auditions.get(prev); if (pa) pa.voteCount--; votes.delete(key); }
  },
  async createScript(parsed, ownerId) { return scriptFromParsed(parsed, ownerId); },
  async createProduction(scriptId, title, auditionsCloseAt) {
    const s = scripts.get(scriptId)!;
    const p: Production = { id: uid(), scriptId, slug: `${s.slug}-${uid().slice(0, 4)}`, title, status: 'casting', entryFeeCents: 1200, houseFeeCents: 200, auditionsCloseAt };
    productions.set(p.id, p); return p;
  },
  async closeCasting(productionId) {
    const p = productions.get(productionId); if (!p) return;
    const members: CastMember[] = [];
    const s = scripts.get(p.scriptId)!;
    for (const ch of s.characters) {
      const entries = [...auditions.values()].filter((a) => a.productionId === productionId && a.characterId === ch.id && a.status === 'submitted').sort((a, b) => b.voteCount - a.voteCount);
      if (!entries.length) continue;
      const [winner, ...losers] = entries;
      winner.status = 'won'; losers.forEach((l) => (l.status = 'lost'));
      const prize = (p.entryFeeCents - p.houseFeeCents) * entries.length;
      ledger.push({ userId: winner.actorId, cents: prize });
      members.push({ productionId, characterId: ch.id, actorId: winner.actorId, actor: profiles.get(winner.actorId)!, prizeCents: prize });
    }
    cast.set(productionId, members); p.status = 'filming';
  },
  async grantStoryteller(userId, until) { const p = profiles.get(userId); if (p) p.storytellerUntil = until; },
};
