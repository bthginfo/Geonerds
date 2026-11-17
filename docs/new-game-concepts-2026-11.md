# Five next GeoNerds games

Research: 17 November 2026. All five concepts are now implemented; the shipping scope below distinguishes actual mechanics from future ideas. Public rules show useful mechanics, not reliable player-count or revenue rankings. No competitor text, images, puzzles or implementation is copied.

## Shipping scope — 18 November 2026

- `/play/atlas-relay`: branching, provably solvable country missions, complete valid-answer sets, three attempts, map/search and an actual successful-country trail. Two conditions on Easy/Medium, usually three on Hard. No fabricated player rarity.
- `/play/world-circuit`: tap/reorder a round trip with four to six required cities, exact optimum, distance allowance and an attainable optional bonus detour. Great-circle distances, not real flight services.
- `/play/latitude-lab`: genuinely continuous north–south placement, tap/drag and keyboard/range controls, explicit tolerance and per-city actual/guessed reveal.
- `/play/coastline-case`: 340 source-derived coast fragments across 145 countries, four name-only options or typing, progressively wider views and a latitude clue. Actual eligible pool varies by difficulty. No invented outline or shared land-border segments.
- `/play/climate-passport`: 65 source-linked NASA POWER/MERRA-2 city profiles for 1991–2020. Separate temperature/precipitation charts, month inspection, real-data season wheel, two priced geographic hints and computed observations. Precipitation includes water-equivalent snow; grid estimates are not station observations.

All use DE/EN, untimed finite runs, manual advancement, sound/haptics preferences and the existing local score/XP/Dex/result pipeline. Coastline/Climate offer All for their eligible finite pools. Combinatorial games instead offer 5/10/25 rounds; practice deals 25, not all possible permutations. Each is featured for one calendar month, then stays in its permanent category. Flag Quiz retains the first regular slot. Online duel allowlists and old challenge seed protocols are unchanged in this release; the planned daily equal-seed/social formats below are not newly implemented.

Source/license details and regeneration: [new-world-data.md](new-world-data.md).

## Original design notes (not every future extension is in the shipping scope)

References: [Farflung](https://farflung.game/) (multiple correct answers and reward for less obvious choices), [Travle](https://travle.earth/) (route reasoning), [Worldle](https://worldle.teuteuf.fr/) (useful distance/direction feedback), [MapTap](https://www.maptap.space/) (place, inspect, confirm rather than accidental taps). Design reference: [Apple Materials](https://developer.apple.com/design/human-interface-guidelines/materials): glass belongs to controls/navigation, leaving content legible.

## 1. Atlas Relay — recommended first

A five-leg expedition with several valid countries for each mission. Choose one country satisfying two visible conditions, then carry an attribute into the next leg. Example: a landlocked country bordering France, followed by a country sharing a language with it. A route can branch; the map builds your personal journey.

- Play: tap a country or search its name, inspect why it qualifies, then confirm.
- Twist: rewards come from completing varied, explicitly stated route objectives, **not fabricated claims about how rare other players' guesses are**.
- Replay: seeded daily missions, unrestricted practice, alternative solutions and friend challenge links.
- Feasible data: existing country/language/border data; generate only provably solvable chains with at least three opening answers. No new image dependency.

## 2. Coastline Case

Investigate a genuine coastal fragment on a blank map. Begin zoomed into a small section; spend a limited set of reveals on a wider view, latitude band or nearby island. Three hypotheses stay on a detective board until you lock your answer.

- Play: zoom/pan, choose a reveal, then choose/type a country.
- Twist: the player controls which evidence to buy, rather than receiving four outlines that reveal the solution.
- Replay: many fragments from actual high-resolution geometry, weighted so tiny islands still have readable evidence.
- Data rule: only coastlines, not internal borders; manually screen unrecognizable fragments and transboundary ambiguity. Do not use political flags as hints.

## 3. World Circuit

Visit five cities in the shortest trip, starting and ending at the same hub. Tap the next stop or reorder the itinerary; animated great-circle arcs show the route. After committing, compare against the optimum and improve your own route.

- Twist: risk/reward bonus stops and a small fuel budget make this a planning puzzle, distinct from the existing land-border Route game.
- Replay: randomized city combinations, regional/easy mode, daily equal-seed competitions and distance-based scoring.
- Feasible data: verified city coordinates. Display distances as great-circle estimates, **not actual flights or available services**. Never invent flight prices/timetables.

## 4. Latitude Lab

A tactile world-scale ordering puzzle: put six city cards on a north–south ribbon, then decide which two are almost level. Each reveal draws their true latitude on a map and shows the surprisingly small/large separation.

- Twist: the ribbon has no country-shaped answer slots; place by spatial knowledge, not matching silhouettes. A west–east variant must explain the date line explicitly.
- Replay: thousands of combinations, mixed hemispheres, optional distance estimates, and progressively closer comparisons.
- Feasible data: existing city coordinates. Keep it visually distinct from Rank It: continuous spatial placement plus a map reveal, not simply sorting a numbered statistic.

## 5. Climate Passport

Identify a region from an animated annual climate profile: temperature curve, monthly rainfall bars and a season wheel. Choose when to spend a reveal on hemisphere, elevation band or landscape. The goal is to distinguish Mediterranean, monsoon, desert, tropical and polar patterns through evidence.

- Twist: a comparative two-profile round asks whether two very different-looking cities could have similar seasons. It teaches a different geographic skill from flags and capitals.
- Replay: authentic city climate normals, mixed seasonal puzzles and difficulty based on similarity of distractors.
- Prerequisite resolved for the shipped single-profile game: NASA POWER gridded 1991–2020 climatology. Comparative two-profile rounds, elevation/landscape hints and formal climate-class exercises remain future ideas. Do **not** invent realistic-looking climate charts or mix incomparable reference periods.

## Suggested order

Atlas Relay → World Circuit → Latitude Lab → Coastline Case → Climate Passport. First ship a small complete mechanic with substantial real content, not five superficial quiz variants. All would inherit the simplified setup/help/feedback, device accessibility preferences and fair challenge contracts.
