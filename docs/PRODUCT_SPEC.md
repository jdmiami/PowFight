# The Play House — Product Spec (MVP)

*"Play" as in theatre, play as in game, Play House as in where it happens.*

## 1. One-liner

A mobile social app where strangers put on a play together. Each actor records their lines as
selfie videos; the app stitches every clip in script order into one continuous performance.
Roles are won by public audition: actors pay to enter, the audience votes for free, the winner
is cast and takes the role's prize pool.

## 2. Who it's for

| Persona | Wants | Pays |
| --- | --- | --- |
| **Audience** (90%+) | Scroll auditions like short-form video, vote, watch finished plays, share clips | Nothing |
| **Actor** | A stage, feedback, a shot at a role and a cash prize, a highlight reel | $12 per audition |
| **Storyteller** | Their script performed by a crowd, a community around it, a finished film | $20 / year |
| **The House** | Sustainable margin, a growing library of plays and performers | keeps $2 per entry + subscriptions |

## 3. Core loop

```
Storyteller uploads script ─► parser extracts characters + lines + sides ─► production opens (casting)
        ▲                                                                        │
        │                                                   actors pay $12, record sides, submit reel
        │                                                                        ▼
  premiere on marquee ◄── worker stitches ◄── cast films every line ◄── audience votes, auditions close,
  (free to watch)                                                       top vote per role wins pool
```

### 3.1 Script ingestion
- Accepts `.epub`, `.txt`, `.html`, `.fountain`. Project Gutenberg boilerplate is stripped.
- Detects layout: *inline cue* (`Rom. Text…`, Folio style), *block cue* (`ROMEO.` on its own line), Fountain.
- Groups speaker cue variants into one character (`Rom`, `Ro`, `Romeo`) with a preset alias map for the
  seeded Romeo and Juliet and prefix heuristics for everything else. Uploader sees the detected cast
  and can rename/merge before staging (merge UI: v1.1, the API already accepts an alias map).
- Stage directions and act/scene headings become **title cards** in the final cut.
- **Audition sides**: for each role, the 3 most substantial speeches between 6 and 60 words, in
  script order. Every entrant performs the same sides so votes compare like with like.

### 3.2 Productions and casting
- A *production* is one staged run of a script with an audition window (default 7 days).
- Per role: unlimited entrants, one entry per actor per role. An actor may enter several roles.
- Audience votes: one vote per role per voter, changeable until close, no self-votes, free. Must be
  signed in (keeps bots and brigading cheap to fight).
- At close: highest votes wins (tie → earliest submission). `close_casting()` writes `cast_members`,
  credits the winner's ledger, records the house fee, flips the production to `filming`.
- Roles with zero entrants: the Storyteller assigns a stand-in (any volunteer, no prize). Roles with
  one entrant are uncontested: they win and their $10 comes back; the house still keeps $2.

### 3.3 Filming and stitching
- Cast members get a queue of every dialogue line of their role with a teleprompter overlay.
- Progress saves per line; retakes replace the previous take.
- When all dialogue lines have an approved clip the render job is queued automatically.
- Worker normalizes every clip to 1080×1920 / 30fps / AAC, letterboxes landscape, loudness-normalizes
  audio, burns the speaker name as a lower third, renders cards for headings/directions, concatenates.
- Output lands in the public `renders` bucket; production flips to `premiered`.

### 3.4 Money
| Flow | Amount | Rail |
| --- | --- | --- |
| Audition entry | $12 one-time | Stripe Checkout (card, Apple/Google Pay) |
| Prize to winner | $10 × entrants for that role | Ledger credit → Stripe Connect Express transfer after premiere |
| House | $2 × entrants | Stays in platform balance |
| Storyteller | $20 / year recurring | Stripe Checkout subscription + webhook |

- The ledger is the source of truth; Stripe IDs are stored for reconciliation.
- Payouts go out **after the play premieres**, which is the incentive that gets winners to actually
  film their lines. A winner who never films within the filming deadline forfeits; the role goes to
  the runner-up (v1.1) and the forfeited prize is refunded pro-rata to entrants (policy decision below).
- Refunds: full refund if a production is cancelled before casting closes. No refunds after voting
  closes. Chargebacks are handled by Stripe Radar + manual review.
- Age: 13+ to use the app, **18+ to enter paid auditions** (contest law + Stripe Connect KYC).
  Birthdate is collected at first audition.

### 3.5 Social surface (MVP scope)
- Marquee (home): now casting, now playing.
- Role page: vertical grid of audition reels ranked by votes; tap to watch; star to vote.
- Audition page: reel player, share link (OG image = poster frame).
- Profile: auditions, winnings, roles won; follow (table exists, UI v1.1).
- Comments on auditions and plays (table + RLS exist, UI v1.1).
- Report button on every clip (table exists; UI v1.1).

## 4. What you hadn't mentioned (and the MVP now covers or has a decision on)

1. **Rights to the script.** Public domain is safe (Shakespeare, Gutenberg). Anything newer needs a
   performance license. Uploaders attest rights at upload; we store the attestation; DMCA contact in the
   footer; takedown flips `scripts.status = 'removed'`.
2. **Rights to the actors' faces.** Terms grant The Play House a license to stitch, host and promote
   clips; actors keep ownership. Deleting an account removes auditions but a premiered play keeps the
   performance (industry standard; stated at upload time).
3. **Contest / sweepstakes law.** Paid entry + prize = contest, legal when **skill-based** (votes on
   acting) rather than chance. Required: published official rules, no purchase necessary alternative
   is *not* required for skill contests, but some states (e.g. AZ, VT, MD) regulate skill contests
   with entry fees. Geo-block those for paid entry until counsel confirms. 1099s for winners over
   $600/yr (Stripe Connect handles tax forms).
4. **Vote integrity.** Signed-in voting, one per role, no self-votes, rate limits, device
   fingerprint + email verification. Add an anomaly check (burst of new accounts voting for one
   entrant) before paying out; payouts are delayed until premiere anyway.
5. **Moderation.** Clips are `pending` until auto-scan (nudity/violence classifier) approves;
   reports queue for human review; three strikes bans. Minors never appear in paid auditions.
6. **Recording UX reality.** iOS Safari gives `video/mp4`, Android gives `webm`; the worker
   normalizes both. Front camera preview is mirrored, the recording is not. Teleprompter shows one line
   at a time with a time estimate (2.5 words/sec).
7. **Empty roles and dropouts.** Stand-ins and runner-up promotion (above).
8. **Scene/act cards and stage directions** so the stitched play is watchable, not just a clip dump.
9. **Line length.** Long monologues are kept as one clip in v1; v1.1 splits speeches over 60 words into
   multiple takes with a continuity cue.
10. **Multiple productions of one script.** The schema separates `scripts` from `productions`, so
    Romeo and Juliet can be staged again next month with a new cast.
11. **Discovery and virality.** Every audition and play has a shareable URL with poster + OG tags;
    short vertical format is ready for reposting to TikTok/Reels/Shorts with a watermark (v1.1).
12. **Accessibility.** Auto-captions from transcripts (v1.1: Whisper on the worker); text of every
    line is already shown under each clip.
13. **Cost control.** Clips capped at 60 MB; renders run once per production; storage lifecycle
    deletes losing audition raw clips 90 days after close (keep the stitched reel).
14. **Trust/safety for payments.** Stripe Radar, 3DS, payout holds, KYC through Connect Express.
15. **Analytics to track.** Audition conversion (role page → paid), votes per audition, time-to-cast,
    filming completion rate, premiere completion rate, D7 retention of voters.

## 5. Non-goals for MVP
Live performance, duet/split-screen scenes, AI voice or face tools, native app store builds (PWA
first), script editing in-app, multi-language.

## 6. Open decisions for you
- Forfeited prizes: refund entrants, roll into the house, or roll into the next production's pool?
- Tie-break: earliest submission (implemented) vs. a 24h sudden-death vote?
- Should the Storyteller get a cut (e.g. $1 of the $2 house fee) to incentivize great scripts?
- Minimum entrants to run a role contest (e.g. 2) vs. uncontested wins?
- App name on stores: "The Play House" is used by several theatres; the handle `theplayhouse.app`
  style domain should be checked and trademark-searched before launch.
