export type ProductionStatus = 'casting' | 'voting_closed' | 'filming' | 'rendering' | 'premiered' | 'cancelled';
export type AuditionStatus = 'pending_payment' | 'draft' | 'submitted' | 'withdrawn' | 'disqualified' | 'won' | 'lost';

export interface Profile {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl?: string | null;
  storytellerUntil?: string | null;
  isAdmin?: boolean;
}

export interface Character {
  id: string;
  key: string;
  name: string;
  aliases: string[];
  lineCount: number;
  wordCount: number;
}

export interface Line {
  id: string;
  idx: number;
  sceneIdx: number;
  sceneTitle?: string | null;
  type: 'dialogue' | 'direction' | 'heading';
  characterId?: string | null;
  text: string;
  estSeconds: number;
}

export interface Script {
  id: string;
  slug: string;
  title: string;
  author?: string | null;
  source?: string | null;
  license?: string | null;
  status: 'draft' | 'review' | 'published' | 'removed';
  ownerId: string;
  characters: Character[];
  lines: Line[];
}

export interface Production {
  id: string;
  scriptId: string;
  slug: string;
  title: string;
  status: ProductionStatus;
  entryFeeCents: number;
  houseFeeCents: number;
  auditionsCloseAt: string;
  filmingDeadlineAt?: string | null;
  finalVideoUrl?: string | null;
  finalPosterUrl?: string | null;
}

export interface Audition {
  id: string;
  productionId: string;
  characterId: string;
  actorId: string;
  actor: Pick<Profile, 'id' | 'handle' | 'displayName' | 'avatarUrl'>;
  status: AuditionStatus;
  stitchedUrl?: string | null;
  posterUrl?: string | null;
  voteCount: number;
  submittedAt?: string | null;
  createdAt: string;
}

export interface Clip {
  id: string;
  ownerId: string;
  productionId: string;
  lineId: string;
  auditionId?: string | null;
  purpose: 'audition' | 'performance';
  storagePath: string;
  url?: string;
  durationMs?: number | null;
  /** Capture timing from the recorder (ms from recording start). The stitcher trims to these. */
  actionAtMs?: number | null;
  trimStartMs?: number | null;
  trimEndMs?: number | null;
  moderation: 'pending' | 'approved' | 'rejected';
}

/** One card in the audition feed: everything needed to render a reel without more queries. */
export interface FeedItem {
  audition: Audition;
  character: Pick<Character, 'id' | 'key' | 'name' | 'lineCount'>;
  production: Pick<Production, 'id' | 'slug' | 'title' | 'status' | 'auditionsCloseAt' | 'entryFeeCents' | 'houseFeeCents'>;
  /** Storage paths of this audition's side clips in script order (resolve to URLs with clipUrl). */
  clipPaths: string[];
  rank: number;
  entrants: number;
  /** First side's text, for the caption. */
  caption?: string;
}

export interface FilmQueueItem {
  line: Line;
  character: Character;
  clip?: Clip;
  /** What the actor is answering: the previous other-speaker line in the scene, or the scene heading. */
  cue?: { kind: 'line'; speaker: string; text: string } | { kind: 'heading'; text: string };
}

export interface CastMember {
  productionId: string;
  characterId: string;
  actorId: string;
  actor: Pick<Profile, 'id' | 'handle' | 'displayName' | 'avatarUrl'>;
  prizeCents: number;
}

export interface RoleBoardEntry {
  character: Character;
  entrants: number;
  leader?: Audition;
  sides: Line[];
}
