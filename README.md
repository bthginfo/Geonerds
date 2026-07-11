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
