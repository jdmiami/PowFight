# The Play House 🎭

**A social app where people put on a play together, one selfie line at a time.**

Pick a character. Record your lines with your phone's front camera. The Play House stitches every
actor's clips into the full performance. Roles are won by audition: actors pay to enter, the
audience votes for free, the winner takes the role and the prize pool.

> "All the world's a stage" was never this literal.

## What's in this repo

| Path | What |
| --- | --- |
| `apps/web` | Next.js 16 mobile-first PWA: marquee, plays, roles, audition recorder, voting, filming, watching, script upload, pricing, profile. Runs in **demo mode** with zero config. |
| `apps/worker` | Render worker: normalizes phone clips with ffmpeg and stitches audition reels and whole productions (title cards for scenes and stage directions). Docker image included. |
| `packages/script-parser` | Zero-dependency parser: EPUB/TXT/HTML/Fountain → characters, lines, scenes, audition sides. Tested on the Project Gutenberg First Folio *Romeo and Juliet*. |
| `supabase/migrations` | Postgres schema, RLS policies, storage buckets, and the `close_casting()` prize function. |
| `content/` | Parsed *Romeo and Juliet* (the first play) as text and JSON. |
| `docs/` | Product spec, architecture, MVP plan, money/legal notes, and open questions. |

## Quick start (demo mode, no accounts needed)

```bash
npm install
npm run build -w packages/script-parser
npm run dev            # http://localhost:3000
```

Demo mode seeds *Romeo and Juliet* with a few fake auditions. You are signed in as a demo user,
payments are skipped, and clips you record are kept in memory until the server restarts.

## Go live

1. **Supabase**: create a project, run `supabase/migrations/*.sql` in order, enable Email (magic
   link) and Google auth, set the site URL. Copy the URL, anon key and service-role key.
2. **Stripe**: create a yearly $20 "Storyteller" price; set the webhook to
   `https://<host>/api/stripe/webhook` for `checkout.session.completed` and `invoice.paid`.
3. Copy `apps/web/.env.example` to `apps/web/.env.local` and fill it in.
4. Seed the first play: `npm run import:script -- content/romeo-and-juliet.json` (uses the
   service key; creates the script, characters, lines, sides and opens a 7-day casting).
5. Deploy `apps/web` (Vercel works out of the box) and run `apps/worker` anywhere with ffmpeg:
   `docker build -t playhouse-worker apps/worker && docker run -e SUPABASE_URL=… -e SUPABASE_SERVICE_ROLE_KEY=… playhouse-worker`.

## Tests

```bash
npm test                      # parser + worker (worker test renders real clips with ffmpeg)
npm run test -w apps/web      # prize math
npm run lint -w apps/web
```

## The deal

- **Free** to watch, scroll and vote.
- **$12** to audition for a role. $10 of every entry goes into that role's prize pool, $2 to the house. The most-voted actor when auditions close wins the role and the whole pool.
- **$20/year** (Storyteller) to upload scripts and stage productions.

See `docs/PRODUCT_SPEC.md` for everything else: moderation, payouts, rights, edge cases, and the roadmap.
