import type { Audition, CastMember, Character, Clip, Line, Production, Profile, RoleBoardEntry, Script } from '../types';
import type { ParsedScript } from '@playhouse/script-parser';
import { isDemo } from '../env';

export interface DataSource {
  // reading
  listProductions(): Promise<Array<Production & { scriptTitle: string; author?: string | null }>>;
  getProductionBySlug(slug: string): Promise<{ production: Production; script: Script } | null>;
  getRoleBoard(productionId: string): Promise<RoleBoardEntry[]>;
  getRole(productionId: string, characterKey: string): Promise<{ character: Character; sides: Line[] } | null>;
  listAuditions(productionId: string, characterId: string): Promise<Audition[]>;
  getAudition(id: string): Promise<(Audition & { clips: Clip[]; sides: Line[] }) | null>;
  getMyVotes(productionId: string, voterId: string): Promise<Record<string, string>>; // characterId -> auditionId
  getCast(productionId: string): Promise<CastMember[]>;
  myAuditions(actorId: string): Promise<Array<Audition & { productionTitle: string; characterName: string; productionSlug: string; characterKey: string }>>;
  myLinesToFilm(productionId: string, actorId: string): Promise<Array<{ line: Line; character: Character; clip?: Clip }>>;
  getProfile(id: string): Promise<Profile | null>;
  myBalanceCents(userId: string): Promise<number>;
  // writing
  createAudition(productionId: string, characterId: string, actorId: string): Promise<Audition>;
  markAuditionPaid(auditionId: string, paymentRef: string, paidCents: number): Promise<void>;
  addClip(input: Omit<Clip, 'id' | 'moderation'>): Promise<Clip>;
  submitAudition(auditionId: string, actorId: string): Promise<void>;
  vote(auditionId: string, voterId: string): Promise<void>;
  unvote(productionId: string, characterId: string, voterId: string): Promise<void>;
  createScript(parsed: ParsedScript, ownerId: string): Promise<Script>;
  createProduction(scriptId: string, title: string, auditionsCloseAt: string): Promise<Production>;
  closeCasting(productionId: string): Promise<void>;
  grantStoryteller(userId: string, until: string): Promise<void>;
}

let cached: DataSource | null = null;

export async function getData(): Promise<DataSource> {
  if (cached) return cached;
  if (isDemo) {
    const { demoData } = await import('./demo');
    cached = demoData;
  } else {
    const { supabaseData } = await import('./supabase');
    cached = supabaseData;
  }
  return cached;
}
