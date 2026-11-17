# Five new geography games

Development-only surface brief. This extends the established GeoNerds world; it does not replace `PRODUCT.md`, `DESIGN.md` or `.impeccable/design.json`. Native Impeccable CLI loading of this direct record remains unverified, as recorded in `../development-surface-briefs.json`.

## Scope and mode

Operate. The playable surfaces are `src/games/atlas-relay/atlas-relay-game.tsx`, `world-circuit/world-circuit-game.tsx`, `latitude-lab/latitude-lab-game.tsx`, `coastline-case/coastline-case-game.tsx` and `climate-passport/climate-passport-game.tsx`. Related source includes their generators, `new-world/` helpers and messages, the literal lazy imports in `src/app/play/[game]/page.tsx`, registry, permanent categories and `GameId`/DE/EN integration.

This is an ordinary extension of the November 2026 restrained iOS / Liquid Glass system. The GeoNerds name, globe identity, theme variables, Geist hierarchy, shared Button, game shell/HUD/help, `VisualGameFrame`, `useVisualSession` and manual `RoundFeedback` remain authority. Neither system file was rewritten for this pass.

## Audience, job and next action

Mobile-first DE/EN geography players, retaining desktop and keyboard operation. Understand the distinct action in setup, inspect geographic evidence, make a deliberate choice or placement, submit, read the explanation and choose Next. Shared progression and results are reused; practice is unranked and saves no points. These games do not expand the online-duel allowlist or introduce weather/flight services.

## Content and interaction

- Atlas Relay builds a personal country trail. Pick on the existing world map or search, then check only the submitted country against every condition. Three different attempts end each leg; valid successful countries carry into later missions and cannot repeat. The UI reveals the valid-country list only after the leg ends.
- World Circuit appends city stops to a round trip, with list-based reorder, remove and undo controls alongside map selection. The distance budget and planned route remain visible; submission reveals efficiency and a comparison with the shortest required-stop route. Optional bonus-stop efficiency is explicitly distinguished from that required-only comparison. Lines are geographic great-circle estimates, not flight availability.
- Latitude Lab starts without guessed positions. Select a city, tap or drag a continuous north-south ribbon, or use its range/keyboard controls; place every city before checking. The tolerance and required success count appear beside the board. Reveal adds true-position rings, per-city errors and a context map.
- Coastline Case shows a clipped genuine exterior coast arc, not political borders or a full target outline. Three priced clues progressively widen the view and reveal a latitude band. Answer with country names or typing; the reveal adds the flag, country and location map.
- Climate Passport uses twelve real monthly values in separately labelled temperature and precipitation charts. Month buttons expose exact values without hover; a precipitation-wheel view repeats the same monthly totals. A screen-reader table is present in source. Choice-only answers and two priced geographic clues lead to computed seasonal explanations, a map and source links after submission.

Atlas Relay, World Circuit and Latitude Lab have finite 5/10/25 runs; their practice setting deals a bounded 25-board/leg pack, not every possible combination. Coastline Case and Climate Passport additionally support a finite All pool at the selected difficulty. Every game is untimed. Successful-country hits feed the existing completion contract; source-level wiring is not proof that every remote-account path was exercised.

## Chosen expression and system preservation

The evidence board carries the distinction between games: real map and route geometry, a latitude ribbon, a coastline arc or monthly data. Essential controls follow the evidence, with wrapping status and readable explanations. Solid cards/inset surfaces, blue selection, semantic feedback text/icons, rounded controls and short reduced-motion-aware state changes reuse the established system. The chart's amber temperature line and blue precipitation marks are data encodings, not new global palette tokens.

No new aesthetic workshop, global type scale, material, page composition rule or standing build-path preference is established. No new raster was created or requested: flags use the existing flag component; cartography and charts are meaningful source/data-derived vectors. There is therefore no new shipping raster provenance to record.

## Geographic data and attribution

The detailed maintenance/provenance record is `docs/new-world-data.md`; this brief does not replace it. Coast fragments retain their original source-arc identifiers and the source file SHA-256 in `src/data/coastline-fragments.json`: Natural Earth via world-atlas 2.0.2, 1:10m, derived from `public/geo/countries-10m.json`. The in-game source/licence link points to Natural Earth's public-domain terms. Context maps reuse existing Natural Earth cartography.

`src/data/climate-profiles.json` records NASA Langley POWER / NASA Earth Science Division, MERRA-2, Climatology API v2.10.1, retrieved 17 November 2026, with the common 1991-2020 period and original per-profile URLs. These are gridded estimates, not station observations or current weather. Monthly precipitation totals convert mm/day using mean month lengths over that period and include snow water-equivalent. NASA source/methodology/attribution links are exposed in the answer explanation. Gameplay uses committed snapshots, not live NASA requests. No illustrative, stock or AI-generated map, flag or climate values substitute for those sources.

## Catalogue and release integration

All five have literal lazy route imports, named registry entries, setup notes and bilingual catalogue/help strings. Atlas Relay and World Circuit have permanent homes in Expeditions & routes; Latitude Lab and Coastline Case in Maps & shapes; Climate Passport in World knowledge. Each has an explicit feature timestamp; the existing calendar-month logic temporarily places it in New games before returning it to its permanent group. Flag Quiz remains first in the ordinary catalogue. This extension does not redesign the home or companion products.

## Verification boundary

This documenter's pass is source-only: incumbent system files, global tokens, representative game/component code, registration/messages and committed source metadata were inspected. No browser, tests, build, server, commit or push was run by the documenter.

The parent's independent finish reviewer returned SHIP at the supplied five-new-game scope, with 13 valid captures and no material fixes required. This is an inherited-world extension, not a new QUALITY BAR identity exercise; no new raster obligation was introduced.

The parent reports actual submit, locked-feedback and manual-Next flows in all five games. Coastline Case completed five normal rounds and showed a 1/5, 1,000-point local result with XP/Dex/badges. Atlas Relay accepted Egypt for 1,000 points and retained it in the trail after Next. Latitude Lab exercised pointer and keyboard placement; World Circuit exercised selection and keyboard reordering. Climate Passport was checked at 320px and 1440px, including charts, wheel, month keyboard selection, a paid clue, an 800-point correct answer, source information and manual Next. German/light samples covered Atlas Relay and World Circuit. Final 320px checks found no horizontal overflow; shared map controls and pins stayed within the viewport. Dense World Circuit pins can overlap at 320px, a non-blocking limitation with the named stop list retained as an accessible alternative.

The parent reports 56 unique focused GEO/core checks, standalone TypeScript and scoped lint passing, plus a final production build after the map-width and Climate help-wording fixes (Next.js 16.3.8, 60 static pages). Focused lint on the final travel-map/messages edits also passed. The only subsequent source edit removed a trailing blank line from the pure city catalogue, without semantic or UI changes. The rechecked EN/DE Climate help accurately identifies the complete data table as a screen-reader resource, not a visible disclosure control.

Full-project ESLint still fails in unchanged legacy Poke files; this is not a green whole-project lint claim. The parent also observed the existing shared ThemeToggle SSR/client aria-label hydration warning with a persisted theme. Neither is repaired or legitimized by this surface record, and no zero-console claim is made.

These reports were not independently rerun here and do not certify all difficulties, finite-All pools, practice persistence, authenticated/global score services, online duels, measured contrast, every DE/light layout or cross-browser completeness. Later implementation corrections require a source recheck before widening this record's claims.

## Unresolved decisions and drift

No new brand decision is open. The incumbent pre-existing sidecar-stale finding is deliberately left untouched; resolving it is outside this extension. Existing tiny captions, task-local labels and route-specific exceptions are not promoted into system rules. Any browser finish finding remains owned by the parent verification pass, not legitimized as a token or doctrine here.
