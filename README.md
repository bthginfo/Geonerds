# 🌍 GeoNerds

A modern, mobile-and-desktop-perfect web app for playing small geography games.
Flags, capitals, country shapes and more — fast, beautiful quizzes with points,
streaks and timers. English (default) and German.

Built with **Next.js 16 (App Router) · TypeScript · Tailwind v4 · Framer Motion · d3-geo**.
Deploys cleanly to Vercel.

## Games

| Game | Description |
|------|-------------|
| **Flag Quiz** | Guess the country from its flag. Multiple-choice or type-the-name (with typo-tolerant fuzzy matching, EN/DE accepted). |
| **Geo Expedition** | Choose a regional six-checkpoint campaign with branches, shared energy, stars, a final challenge and checkpoint-safe resume. |
| **Capitals** | Match capitals to their countries — choice or typing. |
| **Outline Quiz** | Identify a country from its silhouette alone. |
| **Higher or Lower** | Top-Trumps style: compare countries by population, area, density or GDP. Endless streak mode. |
| **Find on Map** | Tap the right country on an interactive world map; its flag pins to the map so you can track progress. Pinch/scroll to zoom. |
| **Map Jigsaw** | Rebuild every real land neighbor around a glowing anchor country with no target outlines or map clues. |
| **Geo Connections** | Build a country chain through borders, shared languages, currencies and subregions. |
| **Draw the Outline** | Draw a country's shape with your finger/mouse — scored by how closely it overlaps the real borders (IoU). |
| **Border Chain** | Name as many of a country's land neighbours as you can before the clock runs out; it chains into neighbours-of-neighbours. |
| **Rank It** | Put countries in order by population, area, density, GDP or other geographic metrics. |
| **Scripts & Money** | Identify countries from writing systems, language samples and currencies. |
| **Pin the Place** | Place capitals and landmarks on a zoomable world map. |
| **Land Route** | Build a valid country-to-country route using land borders. |
| **Rivers & Lakes** | Identify highlighted waterways in geographic context. |
| **Who Am I?** | Combine neighbour, language, currency and regional clues. |
| **Trace the River** | Draw the course of a river and compare it with the real path. |
| **Where's That From?** | Match foods, animals, inventions and traditions to their origin. |
| **Name All** | List every country that matches a rotating geographic theme. |
| **Mountains & Volcanoes** | Locate famous peaks and volcanoes on the map. |
| **Color the Flag** | Reconstruct national flags from their real colour palette. |
| **Geo-Nerd Millionaire** | Climb through progressively harder geography questions with limited lives. |

Daily and weekly challenges mix these mechanics into seeded runs that are the same for every player.

All games share one scoring engine (base points × difficulty × speed bonus × streak),
a results screen, and a local leaderboard.

## Flags with giveaway text

Flags whose lettering would reveal the country (e.g. the Central-American coats of
arms, Bolivia, Brazil's motto) have that text region blurred in quiz mode — see
`FLAG_OBSCURE` in `src/components/flag-image.tsx`.

## Community ideas and duels

The compact Home feedback callout accepts game ideas, improvements and bug reports
from signed-in players or anonymous guests. Submissions are stored in Postgres;
failed sends retain the draft, and identical retries do not create duplicates.
Signed in as **TheCreator**, open `/admin/feedback` (or **View submissions** on
Home) to read all messages and mark them new/reviewed. This account is checked
against its signed session UID and database record on every admin request.

On `/challenges`, enter an opponent's username directly or open the searchable
player list. It includes all registered accounts, even those without scores,
and excludes your own account. The signed-in-only `/api/challenges/users` endpoint
returns public names in alphabetical pages of 20, with case-insensitive literal
search and keyset pagination. No account IDs or private data are exposed; manual
entry remains available if browsing is temporarily unavailable.

The **Duels** tab on `/leaderboard` ranks completed Geo challenges: 3 points per
win, 1 per draw and 0 per loss, followed by win rate and wins for tie-breaking.
Equal standings share a rank. Filter by game or the current calendar month;
monthly results use completion time. Both attempts must exist, and unfinished,
cancelled or expired challenges never count. Public standings expose aggregates,
not private invitations or opponents' unfinished results.

These features use the existing database/auth configuration below; additive
tables and indexes are created automatically. Wine/Poke routes are unaffected.

## Adastra — cities after dark

Inspired by **Adastra1995**'s community suggestion, Adastra asks players to
identify cities from real ISS night photographs: street grids, coastlines,
rivers and the glow of neighbouring settlements are the clues. The initial
reviewed library contains **107 distinct photographs of 64 cities in 33 countries**.
Cloud-obscured or spacecraft-obstructed frames are excluded rather than counted
as extra content. Runs balance different cities before revisiting one, never
reuse a photograph within a run, and share a reproducible seed in challenges.

Play 10, 25, 50 or all photos, with multiple choice or EN/DE typed city names.
There is no timer. Each optional hint removes 25% of the original round's base
points; Easy includes a free regional hint. The viewer supports zoom, native
touch scrolling and mouse panning, plus keyboard controls. The answer reveals
the photo's source record, date, city and geographic explanation.

Images are served locally from `public/images/adastra/`, unchanged from their
reviewed NASA/JSC sources. `src/data/adastra-catalog.json` retains each source
record and attribution. Image courtesy of the Earth Science and Remote Sensing
Unit, NASA Johnson Space Center. See the [NASA/JSC image conditions](https://eol.jsc.nasa.gov/FAQ/)
and [NASA media guidance](https://www.nasa.gov/nasa-brand-center/images-and-media/).
No endorsement by NASA is implied. The import utility
`scripts/import-adastra-photos.mjs` accepts a manually reviewed candidate JSON
and a temporary contact-sheet directory; it rejects duplicate image bytes,
unapproved hosts, inadequate resolutions and visually excluded frames. Its
returned catalogue is reviewed before being applied to the repository.

On publication, the additive community-reward migration resolves the matching
signed-in submission's account, grants **Game Creator** once and creates one
in-app publication notification. These are account-owned, not derived from
local XP or a display-name check in the browser. Notification reads require the
owner's authenticated session. Offline localhost preview has no production DB
connection and does not grant rewards or send notifications.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build (Vercel-ready)
npm run lint
npm run test       # unit tests for scoring & fuzzy matching
```

## Data

`src/data/countries.json` is built from the public [mledoze/countries](https://github.com/mledoze/countries)
dataset (names incl. German, capitals, borders, area, ISO codes) merged with World Bank
population and GDP. Each country has a difficulty tier (1 = well-known … 4 = obscure)
driving the easy/medium/hard pools. Map geometry is Natural Earth TopoJSON
(`world-atlas`) served from `public/geo/`; flags are local SVGs (`flag-icons`) in
`public/flags/`.

## Architecture notes

- **i18n** — lightweight context (`src/i18n/`) with EN/DE catalogs and an in-app toggle (no URL routing).
- **State** — Zustand (`src/store/`) with `persist` for settings; scores in `localStorage`.
- **Leaderboard seam** — the app talks only to the `ScoreStore` interface
  (`src/lib/leaderboard/`). The current `localScoreStore` can be swapped for an
  `ApiScoreStore` (Vercel Postgres + API routes + accounts) **without changing any
  game code** — the `/leaderboard` page already exists as the surface for it.

## Deploying to Vercel

Standard Next.js app — import the repo into Vercel and deploy. The app works
without a database. To enable accounts and the online leaderboard, configure a
Postgres connection (`DATABASE_URL` or a supported Vercel Postgres variable)
and a strong `AUTH_SECRET`. The optional admin reset endpoint additionally
requires `ADMIN_RESET_TOKEN`; send it as a Bearer token in the `Authorization`
header, never in the URL.
