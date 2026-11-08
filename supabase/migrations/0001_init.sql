-- The Play House — initial schema
-- Postgres 15+/Supabase. Money is stored in integer cents.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique not null check (handle ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null,
  avatar_url text,
  bio text,
  birthdate date,                                   -- age gate (13+ to use, 18+ to compete for cash)
  stripe_customer_id text unique,
  stripe_connect_account_id text unique,            -- for winner payouts
  storyteller_until timestamptz,                    -- $20/yr script-upload subscription expiry
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Scripts (uploaded + parsed plays)
-- ---------------------------------------------------------------------------
create type script_status as enum ('draft', 'review', 'published', 'removed');

create table public.scripts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  slug text unique not null,
  title text not null,
  author text,
  source text,
  license text,
  rights_attestation boolean not null default false, -- uploader asserts they hold rights / public domain
  status script_status not null default 'draft',
  format text,
  cover_url text,
  parsed jsonb,                                      -- full ParsedScript snapshot (for re-import/debug)
  warnings text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  script_id uuid not null references public.scripts(id) on delete cascade,
  key text not null,                                 -- slug within script, e.g. "romeo"
  name text not null,
  aliases text[] not null default '{}',
  line_count int not null default 0,
  word_count int not null default 0,
  sort_order int not null default 0,
  unique (script_id, key)
);

create type line_type as enum ('dialogue', 'direction', 'heading');

create table public.script_lines (
  id uuid primary key default gen_random_uuid(),
  script_id uuid not null references public.scripts(id) on delete cascade,
  idx int not null,                                  -- 0-based order within script
  scene_idx int not null default 0,
  scene_title text,
  type line_type not null,
  character_id uuid references public.characters(id) on delete set null,
  text text not null,
  est_seconds int not null default 5,
  unique (script_id, idx)
);
create index script_lines_char_idx on public.script_lines(character_id);

-- Audition "sides": the lines everyone auditioning for a role must perform.
create table public.audition_sides (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  line_id uuid not null references public.script_lines(id) on delete cascade,
  sort_order int not null default 0,
  unique (character_id, line_id)
);

-- ---------------------------------------------------------------------------
-- Productions: one staged run of a script with its own audition window + cast
-- ---------------------------------------------------------------------------
create type production_status as enum (
  'casting',        -- auditions open, voting open
  'voting_closed',  -- winners being computed / paid
  'filming',        -- cast records every line
  'rendering',      -- worker stitching
  'premiered',      -- final video public
  'cancelled'
);

create table public.productions (
  id uuid primary key default gen_random_uuid(),
  script_id uuid not null references public.scripts(id) on delete cascade,
  title text not null,
  slug text unique not null,
  status production_status not null default 'casting',
  entry_fee_cents int not null default 1200,         -- $12 to compete
  house_fee_cents int not null default 200,          -- $2 kept by the house per entry
  auditions_close_at timestamptz not null,
  filming_deadline_at timestamptz,
  final_video_url text,
  final_poster_url text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Auditions + votes
-- ---------------------------------------------------------------------------
create type audition_status as enum ('pending_payment', 'draft', 'submitted', 'withdrawn', 'disqualified', 'won', 'lost');

create table public.auditions (
  id uuid primary key default gen_random_uuid(),
  production_id uuid not null references public.productions(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  status audition_status not null default 'pending_payment',
  stitched_url text,                                 -- all sides stitched into one audition reel
  poster_url text,
  vote_count int not null default 0,                 -- denormalized for fast feeds
  stripe_payment_intent_id text unique,
  paid_cents int not null default 0,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (production_id, character_id, actor_id)     -- one entry per role per actor
);
create index auditions_role_idx on public.auditions(production_id, character_id, status);

-- One clip per side line. Also reused for final filming (audition_id null, production/line set).
create table public.clips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  production_id uuid not null references public.productions(id) on delete cascade,
  line_id uuid not null references public.script_lines(id) on delete cascade,
  audition_id uuid references public.auditions(id) on delete cascade,
  purpose text not null check (purpose in ('audition', 'performance')),
  storage_path text not null,                        -- supabase storage object path
  duration_ms int,
  width int, height int,
  transcoded_path text,                              -- normalized 1080x1920 h264/aac
  moderation text not null default 'pending' check (moderation in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);
create index clips_perf_idx on public.clips(production_id, line_id) where purpose = 'performance';

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  audition_id uuid not null references public.auditions(id) on delete cascade,
  voter_id uuid not null references public.profiles(id) on delete cascade,
  production_id uuid not null references public.productions(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (voter_id, production_id, character_id)     -- one vote per voter per role
);

create or replace function public.bump_vote_count() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update public.auditions set vote_count = vote_count + 1 where id = new.audition_id;
  elsif tg_op = 'DELETE' then
    update public.auditions set vote_count = vote_count - 1 where id = old.audition_id;
  end if;
  return null;
end $$;
create trigger votes_bump after insert or delete on public.votes for each row execute function public.bump_vote_count();

-- ---------------------------------------------------------------------------
-- Casting result
-- ---------------------------------------------------------------------------
create table public.cast_members (
  id uuid primary key default gen_random_uuid(),
  production_id uuid not null references public.productions(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  audition_id uuid references public.auditions(id),
  prize_cents int not null default 0,
  unique (production_id, character_id)
);

-- ---------------------------------------------------------------------------
-- Money
-- ---------------------------------------------------------------------------
create type ledger_kind as enum ('entry_fee', 'house_fee', 'prize', 'payout', 'refund', 'subscription');

create table public.ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  production_id uuid references public.productions(id),
  audition_id uuid references public.auditions(id),
  kind ledger_kind not null,
  amount_cents int not null,                         -- positive = credit to user, negative = debit
  stripe_ref text,
  memo text,
  created_at timestamptz not null default now()
);

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  amount_cents int not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  stripe_transfer_id text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Rendering
-- ---------------------------------------------------------------------------
create type render_kind as enum ('audition_reel', 'production');
create type render_status as enum ('queued', 'running', 'done', 'failed');

create table public.render_jobs (
  id uuid primary key default gen_random_uuid(),
  kind render_kind not null,
  production_id uuid references public.productions(id) on delete cascade,
  audition_id uuid references public.auditions(id) on delete cascade,
  status render_status not null default 'queued',
  attempts int not null default 0,
  error text,
  output_path text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);
create index render_jobs_queue_idx on public.render_jobs(status, created_at);

-- ---------------------------------------------------------------------------
-- Social
-- ---------------------------------------------------------------------------
create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  production_id uuid references public.productions(id) on delete cascade,
  audition_id uuid references public.auditions(id) on delete cascade,
  body text not null check (length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id),
  clip_id uuid references public.clips(id) on delete cascade,
  audition_id uuid references public.auditions(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  reason text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.scripts enable row level security;
alter table public.characters enable row level security;
alter table public.script_lines enable row level security;
alter table public.audition_sides enable row level security;
alter table public.productions enable row level security;
alter table public.auditions enable row level security;
alter table public.clips enable row level security;
alter table public.votes enable row level security;
alter table public.cast_members enable row level security;
alter table public.ledger enable row level security;
alter table public.payouts enable row level security;
alter table public.render_jobs enable row level security;
alter table public.follows enable row level security;
alter table public.comments enable row level security;
alter table public.reports enable row level security;

-- Public read of published content (watching, scrolling and voting are free).
create policy "profiles are public" on public.profiles for select using (true);
create policy "users edit own profile" on public.profiles for update using (auth.uid() = id);
create policy "users insert own profile" on public.profiles for insert with check (auth.uid() = id);

create policy "published scripts are public" on public.scripts for select using (status = 'published' or owner_id = auth.uid());
create policy "storytellers insert scripts" on public.scripts for insert with check (
  owner_id = auth.uid() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.storyteller_until > now())
);
create policy "owners edit scripts" on public.scripts for update using (owner_id = auth.uid());

create policy "characters public" on public.characters for select using (true);
create policy "lines public" on public.script_lines for select using (true);
create policy "sides public" on public.audition_sides for select using (true);
create policy "productions public" on public.productions for select using (true);

create policy "submitted auditions public" on public.auditions for select using (status in ('submitted', 'won', 'lost') or actor_id = auth.uid());
create policy "actors create auditions" on public.auditions for insert with check (actor_id = auth.uid());
create policy "actors edit own auditions" on public.auditions for update using (actor_id = auth.uid());

create policy "approved clips public" on public.clips for select using (moderation = 'approved' or owner_id = auth.uid());
create policy "owners upload clips" on public.clips for insert with check (owner_id = auth.uid());
create policy "owners delete clips" on public.clips for delete using (owner_id = auth.uid());

create policy "votes visible to voter" on public.votes for select using (voter_id = auth.uid());
create policy "signed-in users vote" on public.votes for insert with check (
  voter_id = auth.uid()
  and exists (select 1 from public.productions pr where pr.id = production_id and pr.status = 'casting' and pr.auditions_close_at > now())
  and not exists (select 1 from public.auditions a where a.id = audition_id and a.actor_id = auth.uid()) -- no self-votes
);
create policy "voters retract" on public.votes for delete using (voter_id = auth.uid());

create policy "cast public" on public.cast_members for select using (true);
create policy "own ledger" on public.ledger for select using (user_id = auth.uid());
create policy "own payouts" on public.payouts for select using (user_id = auth.uid());
create policy "render jobs visible to owner" on public.render_jobs for select using (
  exists (select 1 from public.auditions a where a.id = audition_id and a.actor_id = auth.uid())
);
create policy "follows public" on public.follows for select using (true);
create policy "follow" on public.follows for insert with check (follower_id = auth.uid());
create policy "unfollow" on public.follows for delete using (follower_id = auth.uid());
create policy "comments public" on public.comments for select using (true);
create policy "comment" on public.comments for insert with check (author_id = auth.uid());
create policy "delete own comment" on public.comments for delete using (author_id = auth.uid());
create policy "report" on public.reports for insert with check (reporter_id = auth.uid());

-- Writes to ledger/payouts/cast/render_jobs/productions happen with the service role (server only).

-- ---------------------------------------------------------------------------
-- Storage buckets (private; the app signs URLs)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values
  ('clips', 'clips', false),
  ('renders', 'renders', true),
  ('scripts', 'scripts', false)
on conflict (id) do nothing;

create policy "users upload own clips" on storage.objects for insert
  with check (bucket_id = 'clips' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "users read own clips" on storage.objects for select
  using (bucket_id = 'clips' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "renders are public" on storage.objects for select using (bucket_id = 'renders');
