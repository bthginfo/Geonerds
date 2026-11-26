# GeoNerds

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Geography players learning independently and challenging other players. The owner uses the administrator account TheCreator. Mobile usability and desktop/keyboard play are both required; repeated mobile screenshots and requests establish the mobile priority.

## Product Purpose

A bilingual DE/EN geography arcade with varied games, meaningful learning feedback, replayable question pools, country collection and friendly competition.

## Capabilities and Constraints

- Existing Next.js 16 / React / Tailwind application, same GitHub repository and domain.
- GEO catalogue (30 games after the 26 Nov 2026 clean-up), daily puzzles with a shared daily board per difficulty, daily/weekly mixed runs, saved progression, XP/ranks/badges, country Dex and mastery-gated outlines/recipes.
- Retired games stay resolvable by name for historical scores, badges and challenges (`src/games/retired.ts`); catalogue decisions use anonymous play counters (`gn_play_stats`) and account runs.
- Accounts, public badges, device/global/duel leaderboards, seeded asynchronous challenges, shareable guest invitations, random/open challenges, immediate unranked bot training in supported games.
- Community submissions, private administrator review and targeted release notifications.
- Preserve accounts, scores, saved progress, rules, geography source credits and compatibility of existing challenge seeds.
- Wine/Poke companion routes are retained but not promoted from the Geo home.
- Flag Quiz stays first in the ordinary game list. Featured games stay in New games for one calendar month and then belong to their permanent category.
- No total Adastra catalogue/image count in player-facing promotion; the collection will grow.

## Brand Commitments

Preserve GeoNerds name and globe logo. The November 2026 request explicitly pins an iOS-inspired, restrained Liquid Glass direction with exceptional ease of use; familiar controls and readable content matter more than decorative translucency. DE and EN remain first-class. No unsubstantiated claims of flawless or 100% quality.

## Evidence on Hand

Actual country data, country/river geometry, standalone flag artwork, sourced NASA night photographs and source-linked geographic content in the repository. Account play data and a sourced format research summary are recorded in `docs/geo-overhaul-2026-11-26.md`; competitor popularity figures are never shown to players.

## Product Principles

1. Make the task and the next action apparent before explaining advanced settings.
2. Correctness and fair scoring outrank trivia volume; a defensible alternative must not be silently marked wrong.
3. A wrong answer is an opportunity to learn, not feedback that disappears before it can be read.
4. Preserve progress and user choices; clearly distinguish local progress, online ranking and unranked training.

## Accessibility & Inclusion

Readable light/dark surfaces, touch and keyboard access, visible focus, screen-reader labels, motion/transparency preferences, optional sound/vibration and unrestricted browser zoom. Do not rely on color or drag gestures alone.
