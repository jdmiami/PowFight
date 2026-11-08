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
  moderation: 'pending' | 'approved' | 'rejected';
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
