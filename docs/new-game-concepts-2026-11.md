# Five next GeoNerds games

Research: 17 November 2026. These are original concepts, **not implemented or advertised as available** in this release. Public rules show useful mechanics, not reliable player-count or revenue rankings. No competitor text, images, puzzles or implementation is copied.

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
- Prerequisite: source and license a consistent climate-normal dataset (same reference years). Do **not** generate realistic-looking invented climate charts or mix incomparable stations. This concept needs data work before implementation.

## Suggested order

Atlas Relay → World Circuit → Latitude Lab → Coastline Case → Climate Passport. First ship a small complete mechanic with substantial real content, not five superficial quiz variants. All would inherit the simplified setup/help/feedback, device accessibility preferences and fair challenge contracts.
