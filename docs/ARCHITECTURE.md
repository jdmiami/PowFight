# Architecture

```
┌──────────────┐   HTTPS    ┌───────────────────────────┐    SQL/RLS    ┌──────────────────┐
│ Phone (PWA)  │◄──────────►│ Next.js 16 (apps/web)     │◄─────────────►│ Supabase Postgres │
│ MediaRecorder│  multipart │  RSC pages + route handlers│              │ Auth · Storage    │
└──────────────┘            │  Stripe checkout/webhooks  │              └────────┬─────────┘
                            └─────────────┬─────────────┘                       │ render_jobs
                                          │ service role                        ▼
                                          │                              ┌──────────────────┐
                                   Stripe ◄┘                              │ Worker (ffmpeg)  │
                                                                          │ apps/worker      │
                                                                          └──────────────────┘
```

## Web (`apps/web`)
- **Next.js 16 App Router**, React Server Components for every page, small client islands
  (`Recorder`, `VoteButton`, `Countdown`, upload form). Tailwind v4 with a theatre palette.
- `src/lib/data/` is a **data source interface** with two implementations:
  `demo.ts` (in-memory, seeded from `content/romeo-and-juliet.json`) and `supabase.ts`.
  `isDemo` flips on when Supabase env vars are missing, so the app runs with zero setup.
- `src/proxy.ts` (Next 16's middleware) refreshes the Supabase session cookie.
- Route handlers under `src/app/api/*` do all writes; pages only read.
- Payments: Stripe Checkout sessions created server-side; the webhook is the only thing that marks an
  audition paid or grants the Storyteller plan.

## Database (`supabase/migrations`)
- `scripts → characters → script_lines`, `audition_sides` per character.
- `productions` (one staged run) → `auditions` → `clips` (purpose `audition` | `performance`), `votes`
  (unique per voter/role, trigger keeps `auditions.vote_count`), `cast_members`.
- Money: `ledger` (append-only, cents) and `payouts`. `close_casting(p)` is a `security definer`
  function that crowns winners and writes the ledger atomically.
- `render_jobs` queue claimed by the worker with an atomic conditional update.
- RLS: public can read published content; users write only their own rows; service role for the rest.
- Storage: `clips` (private, path `userId/…`), `renders` (public), `scripts` (private).

## Script parser (`packages/script-parser`)
- Zero dependencies (own ZIP/EPUB reader using `zlib.inflateRawSync`).
- `parseUpload(filename, buffer, opts)` → `ParsedScript { characters, scenes, lines, warnings }`.
- `pickSides(script, characterId, n)` chooses audition sides deterministically.
- Layout detection + a known-cue pre-pass make Folio texts (unindented cues, `3.Wat.` numbering,
  non-breaking spaces, stray `FINIS.` at EPUB chapter breaks) parse cleanly: 26 characters, 827 speeches.

## Worker (`apps/worker`)
- `ffmpeg.ts`: probe, normalize (scale+pad to 1080×1920, 30fps, yuv420p, AAC 48k, loudnorm, silent
  track for mute clips), title cards (drawtext), speaker lower-thirds, concat demuxer with stream copy,
  poster frame.
- `stitch.ts`: plan → segments → one MP4. Tested with synthetic clips of mixed orientation/audio.
- `worker.ts`: polls `render_jobs`, downloads clips, renders, uploads, updates rows, retries 3×.
- Dockerfile based on `node:22-bookworm-slim` + ffmpeg. Run on Fly.io/Railway/Render/any VM; GPU not needed.

## Deployment
- Web → Vercel (or any Node host). Set env from `apps/web/.env.example`.
- Worker → one small container; scale out horizontally, jobs are claimed atomically.
- Supabase handles auth emails, storage CDN, Postgres backups.

## Later
- Switch `cacheComponents: true` and add `use cache` to script/role pages once data access patterns settle.
- Move clip uploads to direct-to-storage signed URLs (bypass the Next.js server) when traffic grows.
- Transcoding on upload (not at render) for instant playback of raw auditions.
