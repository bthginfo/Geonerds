# Existing GEO games: implementation check matrix

Reviewed 2026-10-02. All25 existing catalog components and their data/generators were inspected proportionately. This matrix records source and automated checks, not a claim that every interactive path was manually played in a browser.

## Pools and facts

| Content | Before | After |
| --- | ---: | ---: |
| Playable countries |196 |196 |
| Curated bilingual quiz questions |47 |120 |
| Source-backed landmark additions |0 |73 |
| Origin associations |160 |165 |
| Non-unique/wrong legacy origin labels removed |0 |68 |
| Coloring flags |139 |196 |
| Shared rendered flag palettes |0 |196 |
| Non-capital city entries / countries |166 /55 |166 /55 |
| Peaks |72 |72 |
| Pin places |112 |112 |
| Waters |118 |118 |

The73 landmark additions are single-country sites checked against [UNESCO's country-indexed World Heritage List](https://whc.unesco.org/en/list/). Transnational properties are intentionally excluded. Origin items no longer treat generic elephants, falafel, vodka, tango, skiing, wristwatches or other shared traditions/species as having one indisputable national answer. Specific ambiguous claims were corrected (Gutenberg's press, Scotch whisky, All Blacks haka).

Questions/reveal notes were corrected for Everest's Nepal/China ambiguity, tango's Argentina/Uruguay tradition, South Africa's twelfth official language, the Amazon oxygen myth, invented pizza/pasta, Canada's unsupported lake superlative, Austrian croissant/sewing-machine claims, Atacama's absolute superlative, Russia's time-zone superlative, and cherry tomatoes. Unstable production/tourism/ranking superlatives were replaced with durable place questions. The US language note now describes the dated [White House order of1 March2025](https://www.whitehouse.gov/presidential-actions/2025/03/designating-english-as-the-official-language-of-the-united-states/). South Africa's wording uses its [government language reference](https://www.gov.za/about-sa/south-africas-people); tango uses [UNESCO's joint listing](https://ich.unesco.org/en/RL/tango-00258).

## Component matrix

| Game | Checked / change | Evidence |
| --- | --- | --- |
| Flags | Seeded questions/choices; confusable distractors; complete artwork; post-answer variant context | Round RNG + flag integrity tests |
| Capitals | Seeded capital/city choices; accepted multilingual labels; complete city pool reviewed | Content floors + TypeScript |
| Outline | Seeded recognizable geometry; failed/empty loads allow exit; locale does not regenerate a seed through an unstable translation callback | Geometry tests + TypeScript |
| Trivia | Seeded clue/distractor selection; stable reveal fact; blank/repeated commits guarded; practice HUD | Round RNG + fact integrity tests |
| Higher Lower | Distinct metric values; synchronous guess guard; practice doesn't lose lives; transition cleanup | TypeScript + source audit |
| Map Click | Actual geometry/tiny-state pools; synchronous wrong counter; transition cancellation on exit; load fallback | Geometry/source audit + TypeScript |
| Draw | Closed-shape scoring; valid-stroke gating; duplicate score/finish protection; load fallback; practice HUD | Drawing/geometry tests + TypeScript |
| Border Chain | True all-start count; correct fallback pool; duplicate-found guard; country credit; transition cleanup; practice penalty removal | Border data/source audit + TypeScript |
| Grid | Deterministic solvable board, unique entries; duplicate-submit/finish guard; reset/exit cancels finishing timer | Existing100-seed generator tests |
| Minesweeper | Reciprocal land-border graph; solvable property constraints; safe reveals cannot farm points; cleanup and repeat-finish guard | Existing100-seed generator tests |
| Ranking | Metric ties excluded; revealed correct ranks; up/down keyboard/touch controls; duplicate submit/finish guard; practice HUD | TypeScript + source audit |
| Languages | Seeded currencies/scripts/choices; broader Latin autonym samples; bounded pool size | Content/seed checks + TypeScript |
| Pin | All mode includes countries, capitals and places; timed session starts after assets load; guarded confirms; failed/empty load exit | Geometry/source audit + TypeScript |
| Route | Shortest-path progress; duplicate step guard; hinted steps count as attempts; country credit; practice penalties removed | Graph/source audit + TypeScript |
| Waters | Seeded kind-matched choices; finite all pool; failed/empty load exit | Content floors + TypeScript |
| Neighbors | Seeded progressively revealing clues and choices; stable facts; repeated/blank commit guard; practice HUD | Fact/RNG checks + TypeScript |
| Trace | Uses real difficulty tiers rather than arbitrary alternating rows; pointer cancellation/capture release; high-DPI canvas; scoring/finish guards | Geometry/source audit + TypeScript |
| Origin | More durable place content; ambiguous associations excluded; seeded finite choices | Content floors + integrity tests |
| Name All | Full true border/language answer sets irrespective of difficulty; all theme count; Vatican included; tie-safe border threshold; repeat-find guard | New complete-answer-set tests |
| Mountains | Seeded peaks and options; challenge plays full deck without life termination; guarded blank/duplicate submission; explicit final-life solution | Content floors + TypeScript |
| Color Flag |196 faithful templates; major-ink groups preserve fine heraldry; only correctly completed flags earn country credit; synchronous guards/cleanup; variant context | Pixel round-trip + flag integrity tests |
| Millionaire | Broad120-question curated bank; no duplicate question text during run when another builder result is available; valid language/neighbor distractors; skip isn't an attempted answer; practice doesn't lose lives | Content floors + source audit + TypeScript |
| Connections | Exactly one visible relation answer; wrong answers cannot spend energy twice; correct transition/finish cancellation; practice HUD | Existing generator relation tests |
| Jigsaw | Full reciprocal recognizable neighbor groups; all mode uses full eligible pool; repeat-placement and transition guards; practice penalties removed | Existing puzzle/drop/geometry tests |
| Expedition | Practice is local-only (does not replace saved run/records); children inherit practice; terminal resume no longer indexes checkpoint6; duplicate debrief/finish guard | Existing route/store tests + TypeScript |

Daily/Weekly were also reviewed: seeded builders preserve no-repeated-country decks; language distractors exclude every valid language; neighbor answers vary among valid borders; equal population pairs are excluded. Existing tests check deterministic generation and option integrity in both languages.

Neighbor lists retain territorial border metadata. Country-answer builders resolve playable country codes and avoid claiming that unresolved territory codes are playable. The central Sri Lanka/India spurious land-border fix is shared across games. Rankings/counts use dataset values, not a promise of live geopolitical/economic statistics.

## Verification

- All196 coloring templates restored to source inks and pixel-compared: maximum difference0.
- New focused suite:12/12 passed (flags/policy, deterministic finite RNG, complete Name All sets, content integrity).
- TypeScript passed after implementation changes; final integrated run is performed by the coordinator.
- An initial unrestricted parallel suite passed241 assertions and hit two5-second stress-test timeouts under CPU contention. The content floor initially caught157 origin items; eight further verified place additions brought the pool to165 and that test now passes. The final integrated suite runs with bounded worker concurrency.
- Manual browser review belongs to the integrated frontend evaluation, not this source-only matrix. Wine/Pokémon files and routes were not modified by this pass.
