/**
 * Supabase-backed data source. Reads use the request-scoped client (RLS); writes that must
 * bypass RLS (ledger, casting, render jobs) use the service-role admin client.
 */
import { pickSides, estimateSeconds, slugify } from '@playhouse/script-parser';
import type { Audition, CastMember, Character, Clip, FeedItem, FilmQueueItem, Line, Production, Profile, Script } from '../types';
import type { DataSource } from './index';
import { supabaseServer } from '../supabase/server';
import { supabaseAdmin } from '../supabase/admin';
import { env } from '../env';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const mapProfile = (r: Row): Profile => ({ id: r.id, handle: r.handle, displayName: r.display_name, avatarUrl: r.avatar_url, storytellerUntil: r.storyteller_until, isAdmin: r.is_admin });
const mapCharacter = (r: Row): Character => ({ id: r.id, key: r.key, name: r.name, aliases: r.aliases ?? [], lineCount: r.line_count, wordCount: r.word_count });
const mapLine = (r: Row): Line => ({ id: r.id, idx: r.idx, sceneIdx: r.scene_idx, sceneTitle: r.scene_title, type: r.type, characterId: r.character_id, text: r.text, estSeconds: r.est_seconds });
const mapProduction = (r: Row): Production => ({ id: r.id, scriptId: r.script_id, slug: r.slug, title: r.title, status: r.status, entryFeeCents: r.entry_fee_cents, houseFeeCents: r.house_fee_cents, auditionsCloseAt: r.auditions_close_at, filmingDeadlineAt: r.filming_deadline_at, finalVideoUrl: r.final_video_url, finalPosterUrl: r.final_poster_url });
const mapAudition = (r: Row): Audition => ({ id: r.id, productionId: r.production_id, characterId: r.character_id, actorId: r.actor_id, actor: r.actor ? { id: r.actor.id, handle: r.actor.handle, displayName: r.actor.display_name, avatarUrl: r.actor.avatar_url } : { id: r.actor_id, handle: '?', displayName: 'Unknown' }, status: r.status, stitchedUrl: r.stitched_url, posterUrl: r.poster_url, voteCount: r.vote_count, submittedAt: r.submitted_at, createdAt: r.created_at });
const mapClip = (r: Row): Clip => ({ id: r.id, ownerId: r.owner_id, productionId: r.production_id, lineId: r.line_id, auditionId: r.audition_id, purpose: r.purpose, storagePath: r.storage_path, durationMs: r.duration_ms, actionAtMs: r.action_at_ms, trimStartMs: r.trim_start_ms, trimEndMs: r.trim_end_ms, moderation: r.moderation });

const AUDITION_SELECT = 'id, production_id, character_id, actor_id, status, stitched_url, poster_url, vote_count, submitted_at, created_at, actor:profiles(id, handle, display_name, avatar_url)';

async function sidesFor(db: Awaited<ReturnType<typeof supabaseServer>>, characterId: string): Promise<Line[]> {
  const { data } = await db.from('audition_sides').select('sort_order, line:script_lines(*)').eq('character_id', characterId).order('sort_order');
  return (data ?? []).map((r: Row) => mapLine(r.line));
}

export const supabaseData: DataSource = {
  async listProductions() {
    const db = await supabaseServer();
    const { data } = await db.from('productions').select('*, script:scripts(title, author)').neq('status', 'cancelled').order('created_at', { ascending: false });
    return (data ?? []).map((r: Row) => ({ ...mapProduction(r), scriptTitle: r.script?.title ?? r.title, author: r.script?.author }));
  },
  async listFeed(opts = {}) {
    const db = await supabaseServer();
    let q = db.from('auditions').select(`${AUDITION_SELECT}, character:characters(id, key, name, line_count), production:productions(id, slug, title, status, auditions_close_at, entry_fee_cents, house_fee_cents)`).in('status', ['submitted', 'won', 'lost']).order('vote_count', { ascending: false }).limit(opts.limit ?? 50);
    if (opts.productionId) q = q.eq('production_id', opts.productionId);
    if (opts.characterId) q = q.eq('character_id', opts.characterId);
    const { data } = await q;
    const rows = (data ?? []) as Row[];
    const ids = rows.map((r) => r.id);
    const { data: clips } = ids.length ? await db.from('clips').select('audition_id, line_id, storage_path, line:script_lines(idx, text)').in('audition_id', ids).eq('purpose', 'audition').neq('moderation', 'rejected') : { data: [] };
    const byRole = new Map<string, FeedItem[]>();
    for (const r of rows) {
      const mine = ((clips ?? []) as Row[]).filter((c) => c.audition_id === r.id).sort((a, b) => a.line.idx - b.line.idx);
      const k = `${r.production_id}|${r.character_id}`;
      const list = byRole.get(k) ?? byRole.set(k, []).get(k)!;
      list.push({ audition: mapAudition(r), character: { id: r.character.id, key: r.character.key, name: r.character.name, lineCount: r.character.line_count }, production: { id: r.production.id, slug: r.production.slug, title: r.production.title, status: r.production.status, auditionsCloseAt: r.production.auditions_close_at, entryFeeCents: r.production.entry_fee_cents, houseFeeCents: r.production.house_fee_cents }, clipPaths: mine.map((c) => c.storage_path), rank: list.length + 1, entrants: 0, caption: mine[0]?.line?.text });
    }
    for (const list of byRole.values()) list.forEach((it) => (it.entrants = list.length));
    const out: FeedItem[] = [];
    let added = true;
    while (added) { added = false; for (const q2 of byRole.values()) { const it = q2.shift(); if (it) { out.push(it); added = true; } } }
    return out;
  },
  async productionProgress(productionId) {
    const db = await supabaseServer();
    const { data: p } = await db.from('productions').select('script_id').eq('id', productionId).single();
    const [{ count: total }, { data: filmedRows }, { count: castSize }, { count: rolesTotal }] = await Promise.all([
      db.from('script_lines').select('id', { count: 'exact', head: true }).eq('script_id', p!.script_id).eq('type', 'dialogue'),
      db.from('clips').select('line_id').eq('production_id', productionId).eq('purpose', 'performance').eq('moderation', 'approved'),
      db.from('cast_members').select('id', { count: 'exact', head: true }).eq('production_id', productionId),
      db.from('characters').select('id', { count: 'exact', head: true }).eq('script_id', p!.script_id),
    ]);
    return { filmed: new Set((filmedRows ?? []).map((r: Row) => r.line_id)).size, total: total ?? 0, castSize: castSize ?? 0, rolesTotal: rolesTotal ?? 0 };
  },
  async getProductionBySlug(slug) {
    const db = await supabaseServer();
    const { data: p } = await db.from('productions').select('*').eq('slug', slug).maybeSingle();
    if (!p) return null;
    const [{ data: s }, { data: chars }, { data: lines }] = await Promise.all([
      db.from('scripts').select('*').eq('id', p.script_id).single(),
      db.from('characters').select('*').eq('script_id', p.script_id).order('sort_order'),
      db.from('script_lines').select('*').eq('script_id', p.script_id).order('idx'),
    ]);
    const script: Script = { id: s.id, slug: s.slug, title: s.title, author: s.author, source: s.source, license: s.license, status: s.status, ownerId: s.owner_id, characters: (chars ?? []).map(mapCharacter), lines: (lines ?? []).map(mapLine) };
    return { production: mapProduction(p), script };
  },
  async getRoleBoard(productionId) {
    const db = await supabaseServer();
    const { data: p } = await db.from('productions').select('script_id').eq('id', productionId).single();
    const { data: chars } = await db.from('characters').select('*').eq('script_id', p!.script_id).order('sort_order');
    const { data: auds } = await db.from('auditions').select(AUDITION_SELECT).eq('production_id', productionId).in('status', ['submitted', 'won', 'lost']).order('vote_count', { ascending: false });
    const { data: sides } = await db.from('audition_sides').select('character_id, sort_order, line:script_lines(*)').in('character_id', (chars ?? []).map((c: Row) => c.id)).order('sort_order');
    return (chars ?? []).map((c: Row) => {
      const mine = (auds ?? []).filter((a: Row) => a.character_id === c.id);
      return { character: mapCharacter(c), entrants: mine.length, leader: mine[0] ? mapAudition(mine[0]) : undefined, sides: (sides ?? []).filter((s: Row) => s.character_id === c.id).map((s: Row) => mapLine(s.line)) };
    });
  },
  async getRole(productionId, characterKey) {
    const db = await supabaseServer();
    const { data: p } = await db.from('productions').select('script_id').eq('id', productionId).single();
    const { data: c } = await db.from('characters').select('*').eq('script_id', p!.script_id).eq('key', characterKey).maybeSingle();
    if (!c) return null;
    return { character: mapCharacter(c), sides: await sidesFor(db, c.id) };
  },
  async listAuditions(productionId, characterId) {
    const db = await supabaseServer();
    const { data } = await db.from('auditions').select(AUDITION_SELECT).eq('production_id', productionId).eq('character_id', characterId).in('status', ['submitted', 'won', 'lost']).order('vote_count', { ascending: false });
    return (data ?? []).map(mapAudition);
  },
  async getAudition(id) {
    const db = await supabaseServer();
    const { data: a } = await db.from('auditions').select(AUDITION_SELECT).eq('id', id).maybeSingle();
    if (!a) return null;
    const { data: clips } = await db.from('clips').select('*').eq('audition_id', id);
    const mapped = (clips ?? []).map(mapClip);
    for (const c of mapped) {
      const { data } = await db.storage.from('clips').createSignedUrl(c.storagePath, 3600);
      c.url = data?.signedUrl;
    }
    return { ...mapAudition(a), clips: mapped, sides: await sidesFor(db, a.character_id) };
  },
  async getMyVotes(productionId, voterId) {
    const db = await supabaseServer();
    const { data } = await db.from('votes').select('character_id, audition_id').eq('production_id', productionId).eq('voter_id', voterId);
    return Object.fromEntries((data ?? []).map((v: Row) => [v.character_id, v.audition_id]));
  },
  async getCast(productionId) {
    const db = await supabaseServer();
    const { data } = await db.from('cast_members').select('*, actor:profiles(id, handle, display_name, avatar_url)').eq('production_id', productionId);
    return (data ?? []).map((r: Row): CastMember => ({ productionId: r.production_id, characterId: r.character_id, actorId: r.actor_id, prizeCents: r.prize_cents, actor: { id: r.actor.id, handle: r.actor.handle, displayName: r.actor.display_name, avatarUrl: r.actor.avatar_url } }));
  },
  async myAuditions(actorId) {
    const db = await supabaseServer();
    const { data } = await db.from('auditions').select(`${AUDITION_SELECT}, production:productions(title, slug), character:characters(name, key)`).eq('actor_id', actorId).order('created_at', { ascending: false });
    return (data ?? []).map((r: Row) => ({ ...mapAudition(r), productionTitle: r.production.title, productionSlug: r.production.slug, characterName: r.character.name, characterKey: r.character.key }));
  },
  async myLinesToFilm(productionId, actorId) {
    const db = await supabaseServer();
    const { data: members } = await db.from('cast_members').select('character_id, character:characters(*)').eq('production_id', productionId).eq('actor_id', actorId);
    if (!members?.length) return [];
    const ids = members.map((m: Row) => m.character_id);
    const { data: prod } = await db.from('productions').select('script_id').eq('id', productionId).single();
    const [{ data: all }, { data: chars }, { data: clips }] = await Promise.all([
      db.from('script_lines').select('*').eq('script_id', prod!.script_id).order('idx'),
      db.from('characters').select('id, name').eq('script_id', prod!.script_id),
      db.from('clips').select('*').eq('production_id', productionId).eq('purpose', 'performance').eq('owner_id', actorId),
    ]);
    const nameOf = new Map((chars ?? []).map((c: Row) => [c.id, c.name]));
    const lines = (all ?? []) as Row[];
    const out: FilmQueueItem[] = [];
    lines.forEach((l, i) => {
      if (!(l.type === 'dialogue' && ids.includes(l.character_id))) return;
      let cue: FilmQueueItem['cue'];
      for (let j = i - 1; j >= 0; j--) {
        const prev = lines[j];
        if (prev.type === 'heading') { cue = { kind: 'heading', text: prev.text }; break; }
        if (prev.type === 'dialogue' && prev.character_id !== l.character_id) { cue = { kind: 'line', speaker: nameOf.get(prev.character_id) ?? 'Someone', text: prev.text }; break; }
      }
      out.push({ line: mapLine(l), character: mapCharacter(members.find((m: Row) => m.character_id === l.character_id)!.character), cue, clip: (clips ?? []).filter((c: Row) => c.line_id === l.id).map(mapClip)[0] });
    });
    return out;
  },
  async getProfile(id) {
    const db = await supabaseServer();
    const { data } = await db.from('profiles').select('*').eq('id', id).maybeSingle();
    return data ? mapProfile(data) : null;
  },
  async myBalanceCents(userId) {
    const db = await supabaseServer();
    const { data } = await db.from('ledger').select('amount_cents').eq('user_id', userId).in('kind', ['prize', 'payout', 'refund']);
    return (data ?? []).reduce((s: number, r: Row) => s + r.amount_cents, 0);
  },

  async createAudition(productionId, characterId, actorId) {
    const db = await supabaseServer();
    const { data: existing } = await db.from('auditions').select(AUDITION_SELECT).eq('production_id', productionId).eq('character_id', characterId).eq('actor_id', actorId).maybeSingle();
    if (existing) return mapAudition(existing);
    const { data, error } = await db.from('auditions').insert({ production_id: productionId, character_id: characterId, actor_id: actorId }).select(AUDITION_SELECT).single();
    if (error) throw error;
    return mapAudition(data);
  },
  async markAuditionPaid(auditionId, paymentRef, paidCents) {
    const admin = supabaseAdmin();
    const { data: a } = await admin.from('auditions').update({ status: 'draft', stripe_payment_intent_id: paymentRef, paid_cents: paidCents }).eq('id', auditionId).select('actor_id, production_id').single();
    if (a) await admin.from('ledger').insert({ user_id: a.actor_id, production_id: a.production_id, audition_id: auditionId, kind: 'entry_fee', amount_cents: -paidCents, stripe_ref: paymentRef });
  },
  async addClip(input) {
    const db = await supabaseServer();
    const { data, error } = await db.from('clips').insert({ owner_id: input.ownerId, production_id: input.productionId, line_id: input.lineId, audition_id: input.auditionId ?? null, purpose: input.purpose, storage_path: input.storagePath, duration_ms: input.durationMs ?? null, action_at_ms: input.actionAtMs ?? null, trim_start_ms: input.trimStartMs ?? null, trim_end_ms: input.trimEndMs ?? null, moderation: 'approved' }).select('*').single();
    if (error) throw error;
    return mapClip(data);
  },
  async submitAudition(auditionId, actorId) {
    const db = await supabaseServer();
    const { error } = await db.from('auditions').update({ status: 'submitted', submitted_at: new Date().toISOString() }).eq('id', auditionId).eq('actor_id', actorId).eq('status', 'draft');
    if (error) throw error;
    await supabaseAdmin().from('render_jobs').insert({ kind: 'audition_reel', audition_id: auditionId });
  },
  async vote(auditionId, voterId) {
    const db = await supabaseServer();
    const { data: a } = await db.from('auditions').select('production_id, character_id, actor_id').eq('id', auditionId).single();
    if (!a) throw new Error('no audition');
    if (a.actor_id === voterId) throw new Error('You cannot vote for yourself');
    await db.from('votes').delete().eq('voter_id', voterId).eq('production_id', a.production_id).eq('character_id', a.character_id);
    const { error } = await db.from('votes').insert({ audition_id: auditionId, voter_id: voterId, production_id: a.production_id, character_id: a.character_id });
    if (error) throw error;
  },
  async unvote(productionId, characterId, voterId) {
    const db = await supabaseServer();
    await db.from('votes').delete().eq('voter_id', voterId).eq('production_id', productionId).eq('character_id', characterId);
  },
  async createScript(parsed, ownerId) {
    const db = await supabaseServer();
    const slug = `${slugify(parsed.title)}-${Math.random().toString(36).slice(2, 6)}`;
    const { data: s, error } = await db.from('scripts').insert({ owner_id: ownerId, slug, title: parsed.title, author: parsed.author, source: parsed.source, license: parsed.license, rights_attestation: true, status: 'published', format: parsed.format, parsed, warnings: parsed.warnings }).select('*').single();
    if (error) throw error;
    const { data: chars } = await db.from('characters').insert(parsed.characters.map((c, i) => ({ script_id: s.id, key: c.id, name: c.name, aliases: c.aliases, line_count: c.lineCount, word_count: c.wordCount, sort_order: i }))).select('*');
    const charByKey = new Map((chars ?? []).map((c: Row) => [c.key, c.id]));
    const rows = parsed.lines.map((l) => ({ script_id: s.id, idx: l.index, scene_idx: l.sceneIndex, scene_title: parsed.scenes[l.sceneIndex]?.title ?? null, type: l.type, character_id: l.characterId ? charByKey.get(l.characterId) ?? null : null, text: l.text, est_seconds: estimateSeconds(l.text) }));
    for (let i = 0; i < rows.length; i += 500) await db.from('script_lines').insert(rows.slice(i, i + 500));
    const { data: lines } = await db.from('script_lines').select('id, idx').eq('script_id', s.id);
    const lineIdByIdx = new Map((lines ?? []).map((l: Row) => [l.idx, l.id]));
    const sides = parsed.characters.flatMap((c) => pickSides(parsed, c.id, 3).map((l, i) => ({ character_id: charByKey.get(c.id), line_id: lineIdByIdx.get(l.index), sort_order: i })));
    if (sides.length) await db.from('audition_sides').insert(sides);
    return { id: s.id, slug: s.slug, title: s.title, author: s.author, source: s.source, license: s.license, status: s.status, ownerId: s.owner_id, characters: (chars ?? []).map(mapCharacter), lines: (lines ?? []).map((l: Row) => ({ ...mapLine(l), text: '' })) };
  },
  async createProduction(scriptId, title, auditionsCloseAt) {
    const admin = supabaseAdmin();
    const { data: s } = await admin.from('scripts').select('slug').eq('id', scriptId).single();
    const { data, error } = await admin.from('productions').insert({ script_id: scriptId, title, slug: `${s!.slug}-${Math.random().toString(36).slice(2, 6)}`, auditions_close_at: auditionsCloseAt, entry_fee_cents: env.entryFeeCents, house_fee_cents: env.houseFeeCents }).select('*').single();
    if (error) throw error;
    return mapProduction(data);
  },
  async closeCasting(productionId) {
    const { error } = await supabaseAdmin().rpc('close_casting', { p_production_id: productionId });
    if (error) throw error;
  },
  async grantStoryteller(userId, until) {
    await supabaseAdmin().from('profiles').update({ storyteller_until: until }).eq('id', userId);
  },
};
