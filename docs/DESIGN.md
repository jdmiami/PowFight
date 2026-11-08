# The Play House — Design Direction

Synthesized from four independent critiques (visual direction, product UX, capture experience,
sceptical customers). Full reports live in the design review for this round; this file is the
decision record every screen is built against.

## Concept: HOUSE LIGHTS DOWN

The chrome is the dark auditorium; the content is the lit stage. Everything the app draws is
near-black and matte. The only bright things are faces in vertical video, one amber spotlight
accent, and cream paper wherever the script appears. It feels like the thirty seconds after the
house lights dim.

It is NOT velvet-and-gilt Victoriana, NOT burgundy gradients with Playfair, NOT TikTok neon.
No emoji, no tassels. Theatre shows up as light, paper and type, never as decoration.

## Ten rules

1. Background is `--house` (#09070A), flat and matte. Light comes from content, never gradients.
2. One amber element per viewport plus the nav indicator. If two things glow, one is wrong.
3. Script text lives on paper, in Fraunces, with speaker cues and hanging indents. Never in a UI card.
4. Faces before letters: anything representing an audition or play shows a video frame. No initial avatars.
5. Two typefaces (Fraunces display/script, Instrument Sans UI), five sizes, tabular numerals.
6. Money is quiet: ink-1 tabular; `$0` is ink-3; prizes are never amber.
7. Curtain red is a surface, not a text colour.
8. Radii: 4px paper, 6px poster frames, 12px controls, full-round pills.
9. The curtain transition fires only on entering an audition, a casting result, a premiere.
10. Build every page at 390px with a 16px gutter and the primary action under the thumb.

## Product decisions from the UX and customer passes

- **The feed is the product.** Home is a full-screen vertical feed of audition reels, autoplaying,
  with role, play and countdown overlaid and the vote ticket on the clip. A list of plays is a menu.
- **Reels before sides, sides before price.** A role page shows a face above the fold; the pool
  size appears only after at least one clip; the price lives on the button.
- **Try before you pay.** A practice take of side 1 with no account and no charge comes before
  "Enter for $12".
- **Modern spelling by default.** Folio text is shown through a spelling modernizer with a toggle,
  so a first-time actor reads a line aloud without stumbling.
- **Dead roles collapse.** Never more than three "be first" rows; empty roles fold into one line
  with a nudge to the easiest win.
- **Optimistic voting, vote-switch confirmation, no self-vote button.** Count updates instantly;
  voting for a second entrant in the same role asks "Switch?"; your own reel shows Share instead.
- **The recorder is a full-screen takeover.** Beat prompter under the lens, face guide, countdown
  that starts recording on "1" for pre-roll, auto-stop on silence, review autoplays.
- **Winners film by scene**, with the partner's cue line shown, a persistent
  "$X unlocks at premiere · N lines to go" header, and progress that survives reloads.
- **Admin controls are never visible to users.**

## Type

| Role | Face | Size / line | Notes |
| --- | --- | --- | --- |
| Display | Fraunces | 44/46 | opsz 144, WONK 1, weight 500 |
| Title | Fraunces | 28/32 | opsz 72 |
| Section label | Instrument Sans | 11/16 | 600, uppercase, 0.18em |
| Body | Instrument Sans | 16/24 | 400 |
| Caption | Instrument Sans | 12/16 | 500 |
| Script | Fraunces | 20/30 on paper, 26/34 in the prompter | opsz 20, weight 350, ≤32ch |

## Colour

Dark (primary): house #09070A · pit #110D10 · surface #1A1417 · surface-2 #241B1F · line #2A2226 ·
ink-1 #F4EDE4 · ink-2 #B8ADA4 · ink-3 #7A6F69 · paper #F3EBDD · paper-ink #1B1518 ·
spot #FFB224 · spot-ink #8A5A00 · curtain #7A1B2E · curtain-2 #B4182D · success #30A46C · danger #E5484D.

## Signature elements

Playbill (paper card with double top rule and noise), Marquee bulbs, Spotlight on the active
line, Poster Frame (9:16, inner mount stroke, bottom shade, rank seal), Ticket (the vote control,
tears when you vote), Curtain (two pleated panels, three moments only).

## The risk no redesign fixes

The supply loop only closes once one production has premiered end to end. The cheapest proof is a
hand-picked cast filming one short play for free and strangers watching it past the first scene card.
