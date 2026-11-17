# Five new geography games — data and rules

## Cities and countries

Atlas Relay uses the shared corrected country catalogue. Every mission's valid-answer set is calculated from every unused country, not just the difficulty tier. Shared attributes refer to dataset fields; hemisphere clues explicitly describe the map reference point, not all territory. Every generated mission has at least three valid answers for the supported finite runs. Conditions must each narrow the answer set; previous successful stops influence later missions.

World Circuit and Latitude Lab use verified capital coordinates plus the existing city catalogue, deduplicated by country and name. World Circuit computes an exact shortest cycle (4–6 required stops); any offered bonus has a demonstrably budget-feasible insertion. Selected-set efficiency is distinct from the required-only optimum. No flight availability, duration or price is implied. Latitude success requires `ceil(0.75 × city count)` correct placements and explains its tolerance before play.

## Coastline Case

`public/geo/countries-10m.json` is world-atlas/Natural Earth cartography. [Natural Earth terms](https://www.naturalearthdata.com/about/terms-of-use/) place its map data in the public domain. Existing source geometry is mechanically extracted by:

```sh
node scripts/build-coastline-catalog.mjs
```

The committed snapshot has 340 fragments across 145 eligible coastal countries. Extraction counts ownership across all polygon rings, selects only exterior arcs with exactly one geometry owner, excludes shared political land borders and major inland-water bounds, splits date-line jumps and rejects tiny/near-straight fragments. Long arcs are windowed and sampled to at most 180 source vertices, preserving shape and endpoints. Each fragment records its original source arc; metadata retains the original file's SHA-256. Some numeric ISO IDs have multiple geometry entries (for example Australia), so provenance checks union their outer rings. This is simplified 1:10 million-scale cartography, not precise surveying, and does not promise every coastal country is covered.

The full clue is still only the selected coast stretch, not the entire country. Progressive views keep actual coast visible; source geometry is never drawn as a fictional coastline. The answer/location and flag remain hidden until submission.

## Climate Passport

Sources: [NASA POWER climatology API](https://power.larc.nasa.gov/docs/services/api/temporal/climatology/), [meteorology methodology](https://power.larc.nasa.gov/docs/methodology/data/sources_meteorology/), [NASA attribution guidance](https://power.larc.nasa.gov/docs/referencing/), [data FAQ](https://power.larc.nasa.gov/docs/faqs/data/).

The committed 65-profile snapshot is NASA Langley POWER / NASA Earth Science Division, MERRA-2, climatology API v2.10.1, retrieved 17 November 2026. Every location uses the same 1991–2020 reference period and verified capital/major-city coordinates, not national centroids. Original point-API URLs are retained per profile and shown after answering. Source/version/date and the gridded-data caveat are visible in game. No live fetch, API key or paid service is needed during play.

```sh
node scripts/build-climate-catalog.mjs
```

This optional maintenance command makes NASA requests with concurrency two, validates period/units/values and writes the derived snapshot. It is not part of build or gameplay. `T2M` is monthly mean temperature in °C. `PRECTOTCORR` is corrected total precipitation in mm/day; each value is multiplied by the mean calendar-month length over 1991–2020 (February = 28 + 8/30 days), rounded to 0.1 mm/month. Precipitation includes rain and snow water-equivalent. Do not label the grid estimates as individual weather-station observations or present them as current weather.

Distractors come from different countries and must exceed an explicit temperature/precipitation separation threshold; Hard selects closer profiles without permitting virtually identical alternatives. These thresholds are a transparent game heuristic, not a scientific climate classification. Warmest/coldest/wettest months, annual precipitation and temperature range are computed directly, never generated facts. Both chart axes are independently labelled to prevent false unit comparisons.

## Integration and scope

Each game has a literal lazy import; new datasets are not imported by Home/registry. All are untimed with synchronized single-submit locks and manual Next. Correct-country hits feed the existing progression pipeline; practice saves no points. Feature timestamps are independent of edits and expire after one calendar month. New online duel protocols/bots, daily-specific formats and weather services are not part of this release.
