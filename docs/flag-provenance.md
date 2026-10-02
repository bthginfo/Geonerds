# GEO flag artwork and color provenance

Reviewed 2026-10-02. The playable universe contains196 countries. This is an artwork/content audit, not a claim that every flag variant has universal political recognition.

## One source of artwork

`public/flags-true/{code}.svg` is the canonical local artwork for flags, coloring, pie reveals and mosaics. `FlagImage` contains the full image at its actual width/height ratio; caller-supplied4:3 classes cannot stretch it. Country codes are normalized to lowercase.

Run `node scripts/rebuild-flag-content.mjs` to regenerate:

- `src/data/flag-ratios.json`: ratios read from the actual SVG dimensions.
- `src/data/flag-palettes.json`:196 visible-ink palettes, with lowercase hex colors, alpha-weighted shares summing to1, and an artwork source path.
- `src/data/color-flags.json`:196 coloring templates, replacing the old139-country subset. Templates reuse source geometry rather than approximate national symbols.

The regeneration script parses and renders every SVG using Sharp. Palette classification assigns antialiased pixels to source inks; almost identical shades and tiny ink flecks are grouped. Nepal's transparent exterior is excluded from its painted-area denominator. Coloring exposes up to7 major ink groups while retaining small multicolor heraldic details in their real source colors. IDs and references are namespaced per flag.

Every template is restored to its real colors and rendered against its source at the same resolution. Latest run:196/196 passed; maximum per-channel pixel difference0. This catches geometry loss, missing black inheritance, changed clip paths and broken symbol references. Interactive group counts:2 colors38,3 colors73,4 colors47,5 colors21,6 colors7,7 colors10.

## Explicit representation decisions

| Country | Local variant and check | Primary reference |
| --- | --- | --- |
| Kyrgyzstan | Current straight sun rays introduced in December2023; source artwork already uses that geometry. | [Office of the President: state symbols](https://www.president.kg/ru/about/symbol) |
| Syria | Green/white/black bands with three red stars, as described in Article6 of the March2025 declaration. No old red/white/black two-star artwork is used. | [Government-authored Arabic declaration archived by International IDEA](https://constitutionnet.org/sites/default/files/2025-03/2025.03.13%20-%20Constitutional%20declaration%20%28Arabic%29.pdf) |
| Afghanistan | Republic-era2004–2021 black/red/green tricolour is deliberately retained as a historical/international-use variant. It is not described as the current de facto authorities' flag. A bilingual note appears only AFTER answers in flag games, coloring, pie and mosaic, avoiding an answer leak. | [Republic embassy's flag specification](https://www.afghanembassy.ca/about-afghanistan/afghanistan-flag.html), [Australian War Memorial: white Emirate flag photographed in Kabul,11 September2021](https://www.awm.gov.au/collection/C2905605) |
| Jamaica | All three inks, including implicit black, survive recoloring; the previous hand-built template lost black. | [Prime Minister's Office: national flag](https://opm.gov.jm/symbols/national-flag/) |
| India | Source artwork retains the Ashoka Chakra and its spokes, not a plain disk. | [Government of India: tricolour](https://knowindia.india.gov.in/my-india-my-pride/indian-tricolor.php) |
| Philippines | Source paths retain the sun's rays and three stars instead of circle approximations. | [Republic Act8491, Section4](https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/4626) |

`src/lib/flag-policy.ts` centralizes the Afghan note and its references. New contexts must show it after a guess/reveal, never in a pre-answer prompt. The assets have been exhaustively checked for coverage, standalone rendering, proportions, recoloring fidelity and palette consistency. The listed recent-change/symbol cases additionally received source review; the automated coverage check alone does not certify every government's legally specified color standard.
