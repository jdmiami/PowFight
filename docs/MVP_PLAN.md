# MVP plan

## Done in this repo
- [x] Monorepo, Next.js 16 app, Tailwind theme, PWA manifest + icon
- [x] Script parser (EPUB/TXT/HTML/Fountain) with tests; Romeo and Juliet parsed and seeded
- [x] Database schema, RLS, storage buckets, casting + prize function, render queue
- [x] Demo mode (no keys) with seeded auditions so every screen is browsable
- [x] Pages: marquee, plays, play, role (sides + ranked auditions + vote), audition recorder,
      audition detail, filming queue, watch, upload, pricing, profile, login, how-it-works
- [x] API: parse, stage script, enter audition (Stripe or demo), upload side clip, submit, vote/unvote,
      Storyteller checkout, Stripe webhook, close casting, performance clip upload
- [x] ffmpeg worker with normalization, cards, lower-thirds, concat; tested end to end
- [x] Docs: spec, architecture, this plan

## Before first real users (≈1–2 weeks)
1. Create Supabase project, run migrations, set auth providers and redirect URLs.
2. Stripe account: products, webhook secret, Connect Express onboarding link on `/me`.
3. Official contest rules + Terms + Privacy pages (counsel review; see spec §4).
4. Birthdate gate on first paid audition; geo-block restricted states for paid entry.
5. Moderation: auto-scan hook on clip upload (e.g. Hive/AWS Rekognition) → `moderation` column;
   `/admin/reports` page.
6. Payout job: after `premiered`, transfer `ledger` prize balances through Stripe Connect.
7. Scheduled job (Supabase cron or Vercel cron) that calls `close_casting` when `auditions_close_at` passes
   and `try_queue_production_render` when the last line lands.
8. Error tracking (Sentry) + product analytics (PostHog) on the events in spec §4.15.

## v1.1
- Character merge/rename UI on upload; manual side selection.
- Runner-up promotion on forfeit; filming deadline reminders (email/push).
- Comments, follows, share sheet with watermark, OG images.
- Captions from Whisper; long-speech splitting.
- Upload direct to storage; transcode on upload.
- Native wrappers (Capacitor) for App Store / Play Store.

## Suggested stack choices (made)
- **Next.js 16 + Supabase + Stripe + ffmpeg worker.** Cheapest path to a working, scalable MVP;
  no custom auth, no custom storage, RLS instead of a hand-rolled permission layer.
- **PWA before native.** Camera + MediaRecorder work in mobile Safari/Chrome; saves 4–6 weeks.
