# GeoNerds overhaul — 26 November 2026

Catalogue clean-up, five new games adapted from currently popular browser formats, a new home and setup flow, and anonymous play statistics.

## 1. What players actually played

Source: `gn_scores` in the production database on 26 November 2026. Only signed-in players save runs there (75 accounts), so guests are not counted. That gap is why this release adds anonymous counters (section 5).

| Game | Runs | Players | Runs, last 30 days | Online since |
| --- | ---: | ---: | ---: | --- |
| Flag Quiz | 463 | 43 | 118 | Jun 2026 |
| Find on Map | 319 | 34 | 74 | Jun |
| Capitals & Cities | 137 | 19 | 13 | Jun |
| Outline Quiz | 105 | 23 | 20 | Jun |
| Geo Grid | 98 | 19 | 32 | Jul |
| Color the Flag | 85 | 21 | 9 | Jun |
| Border Chain | 83 | 23 | 15 | Jun |
| Geo Connections | 81 | 21 | 5 | Jul |
| Draw the Outline / Map Jigsaw | 76 / 76 | 15 / 19 | 34 / 8 | Jun / Jul |
| … | | | | |
| Country Trivia | 16 | 9 | 2 | Jun |
| Pin the Place | 15 | 12 | 5 | Jun |
| Mountains & Volcanoes | 14 | 9 | 3 | Jun |
| City Compass | 13 | 6 | 8 | Oct |
| Scripts & Money | 18 | 12 | 4 | Jun |
| Trace the River | 19 | 9 | 4 | Jun |
| Geo Balance | 17 | 5 | 17 | Oct |
| Geo Expedition | 36 | 11 | 1 | Jul |
| Atlas Relay / World Circuit | 2 / 1 | 1 / 1 | 2 / 1 | 18 Nov |
| Latitude Lab / Coastline Case / Climate Passport | 0 | 0 | 0 | 18 Nov |

## 2. Retired games

Each retired game had both low play counts and a concrete design problem found by playing it, or it duplicated a stronger game:

- **Country Trivia**: same mechanic as *Who Am I?* (clues → country), which is played 3× more. Its reveal keys now live under `neighbors.*`.
- **Mountains & Volcanoes**: narrow pool, overlaps with *Pin the Place*. The peak data moved to `src/games/pin/peaks.ts` and remains part of Pin.
- **Scripts & Money**: tried by 12 players, rarely replayed.
- **Trace the River**: drawing a river on a blank map was mostly frustrating.
- **City Compass**: the relative compass rule needed an explanation before every round.
- **Geo Balance**: an arithmetic target with little geographic payoff.
- **Geo Expedition**: a campaign wrapper around other quizzes (including two retired ones); one run in 30 days.
- **Latitude Lab, Coastline Case, Climate Passport, Atlas Relay, World Circuit** (18 Nov): 0–2 runs in eight days despite top placement as *New games*. Every round needed long instructions before the first action.

Their code, data (`climate-*.json`, `coastline-fragments.json`) and build scripts were removed. `src/games/retired.ts` keeps their names so that saved runs, profile stats, badges and old challenge records still display correctly. `/play/<retired-id>` shows a friendly notice and is `noindex`. Badges tied only to retired games are marked `legacy`: players keep them if earned, but they no longer appear as open goals. *Completionist* now counts only games still in the catalogue. The only challenge for a retired game (Trivia) had already expired. New challenges for retired games are rejected (`LEGACY_CHALLENGE_GAME_IDS`).

## 3. Research: what is popular in browser games right now

Summary of a web research pass (sources are linked):

- NYT Games 2025: Wordle 4.2B solves, Connections 1.6B, Strands 1.5B, Mini 1.4B, Pips 612M ([NBC](https://www.nbcnewyork.com/entertainment/entertainment-news/hardest-wordle-connections-games-2025/6436464/), [Tom's Guide](https://www.tomsguide.com/gaming/nyts-new-game-pips-is-already-addictive-heres-how-to-play)).
- Block Blast: 70M daily users (self-reported, Jan 2026), top downloads in Q3 2026 ([PocketGamer](https://www.pocketgamer.biz/block-blast-reaches-70m-daily-active-users-and-300m-monthly-active-users-worldwide), [mobilegamer.biz](https://mobilegamer.biz/data-digest-scopely-century-and-dream-lead-publisher-list-block-blast-and-arrows-top-download-chart-more/)).
- LinkedIn's daily games: 86% next-day return ([LinkedIn](https://news.linkedin.com/2026/LinkedIn-AnnouncesWend)).
- Bracket City (The Atlantic): nested clues, audience tripled ([Nieman Lab](https://www.niemanlab.org/2025/06/wordle-who-the-atlantic-launches-a-suite-of-new-daily-puzzles-and-games/)).
- Geography: Worldle, Globle, Travle, GeoGuessr, MapTap (2026 breakout, [TechCrunch](https://techcrunch.com/2026/06/18/maptap-a-daily-geography-game-is-my-new-wordle)).
- Gaps with no good geography version: Strands-style word grids, Bracket-City-style nested clues, block puzzles with country-shaped pieces.
- What makes them sticky: the same board for everyone each day, a spoiler-free share grid, graded daily difficulty, streaks without login.

No player counts for competitors are claimed in the product.

## 4. New games

| Game | Adapted from | Mechanic |
| --- | --- | --- |
| **Geo Groups** | Connections | 16 countries, 4 hidden geographic groups; the generator guarantees each tile fits exactly one group. |
| **Letter Atlas** | Wordle × Worldle | Guess the country name letter by letter; each guess also shows distance and direction. |
| **Place Trails** | Strands | Swipe themed place names out of a letter grid that every letter belongs to. |
| **Geo Brackets** | Bracket City | Solve nested clues from the inside out (capital of the largest neighbour of …). |
| **Atlas Blast** | Block Blast | 8×8 block puzzle whose pieces are pixelated real countries; naming the shape doubles the points. |

The four puzzles offer a **daily board** (identical for everyone per UTC date and difficulty, with easy/medium/hard dailies like Pips) and **endless** boards. Shared helpers: `src/games/puzzle-kit.ts` (seed, daily record, streak, share) and `src/games/puzzle-wrapup.tsx` (share grid and countdown). Their names avoid the original trademarks.

## 5. Anonymous play statistics

`gn_play_stats(day, game_id, starts, finishes)` stores only aggregated daily counters, with no user, device, cookie or IP columns. `POST /api/plays` checks the origin, limits each hashed IP to 120 events per hour and increments the counter. `GET /api/plays` returns the 7-day popularity list (CDN cached for 15 minutes) for the home *Popular this week* shelf; the home falls back to the account-data ranking above. TheCreator sees all counts on `/admin/feedback` (*What gets played*). The privacy page describes this in both languages.

## 6. Interface

- Home: hero with *Play today's puzzle* and *Surprise me*, a *Today* shelf for the daily puzzles plus the Daily/Weekly Challenge, *Popular this week* from live data, and visual game tiles (`GameArt`) with real flags, mechanic motifs, *New/Daily/Solved today* markers, personal best and streak.
- Setup: cover art, every setting visible once (no duplicate *All settings* panel), the daily/endless choice up front, a sticky Start button and the personal best.
- In game: a single-row top bar (more room on phones), number keys 1–9 for choices, numbered answer badges.
- Results: *Up next* suggestions, one from the same theme and one from elsewhere.
- SEO: every `/play/<id>` URL now has its own title, description and canonical URL.

## 7. Follow-ups shipped the same day

- **Sideways scroll on phones (fixed):** for players with saved scores, the screen-reader "Best" label in game tiles was positioned against the page instead of the tile and escaped the horizontal shelf, widening the document to ~1,350px. Tiles and shelves are now positioning contexts, and `body { overflow-x: clip }` guards against page-level sideways scroll.
- **Popular this week** merges anonymous counters with saved account runs from the last 7 days (maximum per game, never the sum), so the shelf shows live data from day one.
- **Vercel Web Analytics** loads only after "Accept all" (cookieless; query strings stripped). Settings has a privacy toggle to withdraw consent. Collection starts once Web Analytics is enabled for the project in the Vercel dashboard (Analytics tab).
- **Atlas Blast pieces** are picked per country by the best overlap with the real shape (mean IoU 0.67 → 0.70) at unchanged piece size; bot run length stayed equal or longer.
- **Lint:** `npx eslint src` is clean, including the Poke-/Wine-Nerds areas.
