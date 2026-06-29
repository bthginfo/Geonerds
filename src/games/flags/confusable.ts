/**
 * Groups of flags that look alike, by cca3. On hard difficulty the flag quiz
 * prefers distractors from the same group so the choices are genuinely tricky.
 */
const GROUPS: string[][] = [
  ["TCD", "ROU", "MDA", "AND"], // blue-yellow-red vertical
  ["IDN", "MCO", "POL"], // red/white (two of three)
  ["NLD", "LUX"], // red-white-blue horizontal
  ["RUS", "SVN", "SVK"], // white-blue-red (Slavic)
  ["IRL", "CIV"], // green-white-orange vs orange-white-green
  ["ITA", "MEX", "HUN"], // green-white-red
  ["NOR", "ISL", "DNK", "FIN", "SWE"], // Nordic crosses
  ["AUS", "NZL"], // blue ensign + stars
  ["VEN", "ECU", "COL"], // yellow-blue-red
  ["SLV", "NIC", "HND"], // blue-white-blue (Central America)
  ["ARE", "KWT", "JOR", "SDN"], // pan-Arab
  ["SEN", "MLI", "GIN", "CMR"], // pan-African vertical
  ["EGY", "IRQ", "SYR", "YEM"], // red-white-black
  ["THA", "CRI"], // red-white-blue 5 bands
  ["TUR", "TUN"], // red with white crescent
  ["CHN", "VNM"], // red with yellow star
  ["ARG", "GTM"], // light blue-white-light blue with emblem
  ["POL", "MCO", "SGP"], // red over white
];

const MAP = new Map<string, Set<string>>();
for (const g of GROUPS) {
  for (const code of g) {
    const set = MAP.get(code) ?? new Set<string>();
    for (const other of g) if (other !== code) set.add(other);
    MAP.set(code, set);
  }
}

/** cca3 codes whose flags look similar to the given one. */
export function confusableFlags(cca3: string): string[] {
  return Array.from(MAP.get(cca3) ?? []);
}
