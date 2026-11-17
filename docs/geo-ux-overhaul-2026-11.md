# GeoNerds UX and game audit — November 2026

## Scope

32 GEO catalogue games, common navigation/setup/play/results and account/collection/rankings/duels. Wine/Poke mechanics are not changed. This is an evidence-based improvement pass, not a claim of literal perfection or a fabricated quality percentage.

## Shared changes

- Library-first home, compact topic controls and search, existing category/feature expiry rules retained.
- Structural translucent navigation; solid question/content surfaces; system light/dark, 44px controls, browser zoom, safe areas, reduced motion/transparency and keyboard focus.
- Compact start screen, explicit Play/Practice, round count/difficulty first, all other supported settings in an expandable section. Challenge settings stay server-locked.
- In-game help and sound/vibration controls; fresh-install sound off without overwriting existing choices.
- HUD wrapping and finite 0–1 progress with accessibility labels, clearer answer/results and change-settings path.
- Account, profile, collection, badges, leaderboard and challenge hierarchy; actual data, guards and scoring contracts retained.

## Per-game source review and improvements

Every row received a source-level review and benefits from common setup, help, feedback controls and HUD. Rows not naming a dedicated change are **not** represented as a rewritten mechanic or a complete manual playthrough.

| Game | Review / concrete improvement |
| --- | --- |
| Flags | Shared quiz answer feedback; protected exact different-country names; retain flag artwork/palette/ratio/policy and scoped pools. |
| Capitals & Cities | Hard-tier historic-town additions, old invitation catalogue frozen; shared quiz feedback. |
| Outline | Reviewed high-resolution geometry, small-state filtering and loading path; shared setup/help. |
| Trivia | More sourced place clues; freeze geo-v2 clue bank; retain clue-dependent scoring. |
| Higher or Lower | Explicit Next instead of disappearing reveal; narrow-screen answer controls corrected. |
| Find on Map | Explicit Next, inspectable reveal and timer cleanup; no target-revealing autozoom. |
| Draw the Outline | Drawing/reveal legend and accessible canvas instructions. |
| Border Chain | Reviewed found/revealed state and typed matching; exact other-country false positives fixed globally. |
| Geo Grid | Both selected constraints visible in picker; truthful clipboard failure handling. |
| Minesweeper | Reviewed border-graph generation, reveal/mark distinction and solvability regression coverage. |
| Rank It | Reviewed existing touch/keyboard reorder fallback and metric direction. |
| Scripts & Money | Reviewed valid distractor exclusion; shared quiz/setup/help. |
| Pin the Place | More sourced town targets; map loading/retry/cancellation, keyboard controls, pinch-safe placement. |
| Land Route | Wrapped readable route choices; reviewed shortest-path constraints. |
| Rivers & Lakes | Reviewed same-kind choices, corrected existing geometry and loading states; shared feedback/help. |
| Who Am I? | German region/subregion clues localized; typed different-place guard. |
| Trace the River | Drawing/reveal legend and canvas labels. |
| Where's That From? | 32 additional sourced heritage associations; keep old geo:/geo-v2: invitations stable. |
| Name All | More complete regional intersections (exact neighbour count / no land borders); localized region names. |
| Mountains & Volcanoes | Reviewed separate quiz timer/typing retry; shared help/HUD and global exact-place guard. |
| Color the Flag | Reviewed actual196-flag assets and controls; shared help/feedback preferences. |
| Who Wants to Be a Geo-Nerd? | Larger curated question bank feeds existing generated families; reviewed lifelines and survival setup. |
| Geo Expedition | Reviewed six-stage persistence, branches/energy; shared setup/help retains campaign state. |
| Map Jigsaw | Wrong-answer danger color repaired; reviewed existing drag, keyboard and tap placement without snap outlines. |
| Geo Connections | Explicit Next so relation/evidence remains readable. |
| Flag Pie | Finite single spelling retry, generic non-spoiler hint, synchronous answer guard, optional haptics. |
| City Compass | Ten hard-tier towns, frozen geo-v2 catalogue; shared answer guard and feedback. |
| Flag Mosaic | Shared AnswerPanel fixes and per-target remount reset. |
| Country Radar | Reviewed combobox/attempt/bearing direction; shared setup/help. |
| Adastra | Shared answer fixes/help; preserve actual NASA imagery/credits and hidden catalogue total. |
| Atlas Match | Reviewed real-turn scoring/unique pairs; retain12/16px gutters and explicit mismatch reset. |
| Geo Balance | Reviewed achievable3-of8 target/scoring tolerance/reveal; shared setup/help. |

## Content and fairness

32 original DE/EN questions backed by UNESCO references;32 heritage origin entries;10 coordinate-backed secondary towns in Pin and hard Compass,9 additional city names after deduplication. New Name All themes are derived from complete existing country data rather than selected examples. Flag/outline games already use the full country catalogue; adding invented countries would not improve depth.

New invitation seeds use geo-v3:. Existing geo: and geo-v2: retain their prior pools for affected games. Bot difficulty remains independent of question difficulty and bots stay outside the human duel leaderboard.

## Verification boundaries

Source review covers all32 games. Automated model/content/flag/challenge checks and a production build complement a bounded mobile/desktop browser review of critical representative flows. Not every long game/full-pool run or real production account mutation is manually replayed. Full guarantees across all devices and future content updates are not possible from a single pass.

Verified in this pass:

- Production build completed, including TypeScript and all60 static route outputs; ESLint passed for all changed/new TS/TSX.
- 403 unique GEO/core regression cases passed across the broad50-file run and targeted follow-ups. Three initially resource-contended tests exceeded the default5s timeout; the flag/NASA-asset/generator checks then passed with two workers and a30s limit. A Name All test-ID collision was corrected and covered explicitly.
- Browser: all32 ordinary setup routes at320px rendered without document/body horizontal overflow or an error screen. Home screenshots were inspected at320/390/768/1440px. Flag correct-answer feedback, explicit Next and Help Escape/focus return were verified.
- Independent-context design disposition: **ship at the inspected scope**, no material defect established. Review used the available same-provider model, not an independent model provider.
- Missing browser coverage: DE/light mode, wrong-answer/results, typed/specialized play, authenticated social flows and measured semantic contrast. A browser-command stall bounded further checking; it was not established as an application error. These areas rely on source/build/regression evidence, not a claim of browser verification.
- Local online endpoints returned200 with honest configured:false/empty states; no database credentials, real users, production scores or new notifications were used for QA.

The five proposed next games are documented separately in new-game-concepts-2026-11.md; they are concepts, not empty routes or advertised finished games.
