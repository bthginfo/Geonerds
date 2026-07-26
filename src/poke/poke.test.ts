import { describe, expect, it } from "vitest";
import { POKE_GAME_IDS } from "./registry";
import { SPECIES, SPECIES_BY_ID, species } from "./data";
import { STANDARD_TYPES, typeMultiplier } from "./type-chart";
import {
  EVOLUTION_FAMILIES,
  CASE_CLUES,
  CASE_SUSPECTS,
  CASE_TARGET,
  buildDynamicCase,
  buildPokeGrid,
  gridSolutions,
  isGridPlacementValid,
} from "./fixtures";
import { MAP_EDGES, MAP_NODES } from "./maps";
import { POKE_STORAGE_KEYS } from "./store";
import {
  BOOSTER_SIZE,
  alternativeArtworkUrl,
  canSpendCredits,
  createCard,
  generateBooster,
  rarityForRoll,
  resolveCardArt,
  speciesRarity,
  standardArtworkUrl,
  validKeepSelection,
} from "./cards";
import {
  applyPokeRun,
  emptyPokeProgression,
  localCardBadgeValue,
  shouldRecordDex,
} from "./progression";
import { balancedGenerationBag, shuffleBag } from "./variety";
import {
  battleWinReward,
  circuitPartners,
  generateBattleCircuit,
  recoveryCounterOutcome,
} from "./battle";
import { expeditionStarterRoster } from "./expedition";
import {
  buildGymTrials,
  evaluateGymDeployment,
  gymMemberUses,
} from "./gym-draft";
import {
  eligibleEvolutionFamilies,
  evolutionFamilySequence,
  evolutionLevels,
  isBranchingFamily,
} from "./evolution";

describe("Poke-Nerds launch integrity", () => {
  it("registers exactly thirteen unique games", () => {
    expect(POKE_GAME_IDS).toHaveLength(13);
    expect(new Set(POKE_GAME_IDS).size).toBe(13);
  });
  it("contains 1,025 unique localized default species in correct cumulative caps", () => {
    expect(SPECIES).toHaveLength(1025);
    expect(new Set(SPECIES.map((entry) => entry.id)).size).toBe(1025);
    expect(new Set(SPECIES.map((entry) => entry.name.en)).size).toBe(1025);
    expect(new Set(SPECIES.map((entry) => entry.name.de)).size).toBe(1025);
    expect(SPECIES.filter((entry) => entry.generation <= 1)).toHaveLength(151);
    expect(SPECIES.filter((entry) => entry.generation <= 2)).toHaveLength(251);
    expect(SPECIES.filter((entry) => entry.generation <= 3)).toHaveLength(386);
    expect(SPECIES.filter((entry) => entry.generation <= 9)).toHaveLength(1025);
  });
  it("uses all 18 modern types and exact multiplied relations", () => {
    expect(STANDARD_TYPES).toHaveLength(18);
    expect(new Set(STANDARD_TYPES).size).toBe(18);
    expect(typeMultiplier("electric", ["ground"])).toBe(0);
    expect(typeMultiplier("ice", ["dragon", "flying"])).toBe(4);
    expect(typeMultiplier("fire", ["water", "dragon"])).toBe(0.25);
  });
  it("has an acyclic evolution fixture graph with valid targets", () => {
    const edges = EVOLUTION_FAMILIES.flatMap((family) => [...family.edges]) as {
      from: number;
      to: number;
    }[];
    for (const edge of edges) {
      expect(SPECIES_BY_ID.has(edge.from)).toBe(true);
      expect(SPECIES_BY_ID.has(edge.to)).toBe(true);
    }
    const visit = (id: number, path = new Set<number>()) => {
      expect(path.has(id)).toBe(false);
      const next = new Set(path).add(id);
      edges
        .filter((edge) => edge.from === id)
        .forEach((edge) => visit(edge.to, next));
    };
    EVOLUTION_FAMILIES.forEach((family) => visit(family.nodes[0]));
  });
  it("keeps every map edge and encounter explicitly Kanto FireRed", () => {
    const ids = new Set(MAP_NODES.map((node) => node.id));
    MAP_EDGES.forEach(([a, b]) => {
      expect(ids.has(a)).toBe(true);
      expect(ids.has(b)).toBe(true);
    });
    MAP_NODES.forEach((node) => {
      expect(node.kanto).toBe(true);
      expect(node.version).toBe("firered");
      node.encounters.forEach((id) => expect(SPECIES_BY_ID.has(id)).toBe(true));
    });
  });
  it("ships a dense grid with a nine-distinct-species solution", () => {
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 3; col++)
        expect(
          gridSolutions(row, col).filter((entry) => entry.generation === 1)
            .length,
        ).toBeGreaterThanOrEqual(3);
    const search = (cell: number, used: Set<number>): boolean => {
      if (cell === 9) return true;
      const row = Math.floor(cell / 3),
        col = cell % 3;
      return gridSolutions(row, col)
        .filter((entry) => entry.generation === 1 && !used.has(entry.id))
        .some((entry) => search(cell + 1, new Set(used).add(entry.id)));
    };
    expect(search(0, new Set())).toBe(true);
    expect(isGridPlacementValid(43, 0, 0, [])).toBe(true);
    expect(isGridPlacementValid(25, 0, 0, [])).toBe(false);
    expect(isGridPlacementValid(43, 0, 0, [43])).toBe(false);
  });
  it("builds deterministic mixed-domain grids with a distinct solution", () => {
    for (let cap = 1; cap <= 9; cap++)
      for (let index = 0; index < 8; index++) {
        const a = buildPokeGrid(cap, `mixed:${cap}:${index}`),
          b = buildPokeGrid(cap, `mixed:${cap}:${index}`);
        expect(a.rows.map((rule) => rule.label.en)).toEqual(
          b.rows.map((rule) => rule.label.en),
        );
        expect(new Set(a.rows.map((rule) => rule.domain)).size).toBeGreaterThan(
          1,
        );
        expect(new Set(a.cols.map((rule) => rule.domain)).size).toBeGreaterThan(
          1,
        );
        const order = a.solutions
            .map((ids, cell) => ({ ids, cell }))
            .sort((x, y) => x.ids.length - y.ids.length),
          used = new Set<number>();
        const solve = (slot: number): boolean => {
          if (slot === 9) return true;
          return order[slot].ids.some((id) => {
            if (used.has(id)) return false;
            used.add(id);
            const ok = solve(slot + 1);
            if (!ok) used.delete(id);
            return ok;
          });
        };
        expect(solve(0)).toBe(true);
      }
  });
  it("ships true Case File clues ending in exactly one candidate for every generation cap", () => {
    CASE_CLUES.forEach((clue) => expect(clue.test(CASE_TARGET.id)).toBe(true));
    const remaining = CASE_SUSPECTS.filter((entry) =>
      CASE_CLUES.every((clue) => clue.test(entry.id)),
    );
    expect(remaining.map((entry) => entry.id)).toEqual([CASE_TARGET.id]);
    for (let cap = 1; cap <= 9; cap++)
      for (let seedIndex = 0; seedIndex < 12; seedIndex++) {
        const dossier = buildDynamicCase(
          cap,
          `case-quality:${cap}:${seedIndex}`,
        );
        dossier.clues.forEach((clue) =>
          expect(clue.test(dossier.target.id)).toBe(true),
        );
        const counts = dossier.clues.map(
          (_, index) =>
            dossier.suspects.filter((entry) =>
              dossier.clues
                .slice(0, index + 1)
                .every((clue) => clue.test(entry.id)),
            ).length,
        );
        expect(counts[0]).toBeGreaterThanOrEqual(3);
        expect(counts[0]).toBeLessThanOrEqual(5);
        counts
          .slice(1)
          .forEach((count, index) => expect(count).toBeLessThan(counts[index]));
        expect(counts.at(-1)).toBe(1);
      }
  });
  it("uses Poke-only storage namespaces", () => {
    Object.values(POKE_STORAGE_KEYS).forEach((key) =>
      expect(key.startsWith("poke-nerds-")).toBe(true),
    );
  });
  it("generates deterministic five-card, generation-scoped research sets", () => {
    const a = generateBooster(3, "fixed"),
      b = generateBooster(3, "fixed");
    expect(a).toHaveLength(BOOSTER_SIZE);
    expect(a).toEqual(b);
    a.forEach((card) =>
      expect(SPECIES_BY_ID.get(card.speciesId)?.generation).toBe(3),
    );
    expect(rarityForRoll(0.42)).toBe("common");
    expect(rarityForRoll(0.43)).toBe("uncommon");
    expect(rarityForRoll(0.995)).toBe("mythical");
  });
  it("keeps species rarity intrinsic across packs and respects canonical status flags", () => {
    expect(speciesRarity(species(146))).toBe("legendary");
    expect(speciesRarity(species(151))).toBe("mythical");
    expect(speciesRarity(species(19))).toBe(speciesRarity(species(19)));
    const seen = Array.from({ length: 40 }, (_, index) =>
      generateBooster(1, `rarity-${index}`),
    )
      .flat()
      .filter((card) => card.speciesId === 25);
    expect(new Set(seen.map((card) => card.rarity)).size).toBeLessThanOrEqual(
      1,
    );
  });
  it("uses genuinely different artwork sources for special art and gold", () => {
    const entry = species(25),
      standard = standardArtworkUrl(entry),
      special = alternativeArtworkUrl(entry, "home-render"),
      gold = alternativeArtworkUrl(entry, "shiny-official-artwork");
    expect(special).not.toBe(standard);
    expect(gold).not.toBe(standard);
    expect(createCard(entry, "special", "special-art").artVariant).toBe(
      "home-render",
    );
    expect(createCard(entry, "gold", "gold").artVariant).toBe(
      "shiny-official-artwork",
    );
  });
  it("keeps species rarity invariant across holographic finishes", () => {
    const entry = species(146);
    expect(createCard(entry, "reverse", "reverse-holo").rarity).toBe(
      "legendary",
    );
    expect(createCard(entry, "holo", "holo").rarity).toBe("legendary");
  });
  it("downgrades unavailable alternate art instead of masquerading", () => {
    const resolved = resolveCardArt(species(25), "special-art", () => false);
    expect(resolved.finish).toBe("holo");
    expect(resolved.artVariant).toBe("official-artwork");
    expect(resolved.artworkUrl).toBe(standardArtworkUrl(species(25)));
  });
  it("uses deterministic non-repeating bags with broad 20-round generation coverage", () => {
    const a = shuffleBag([1, 2, 3], 20, "same", String),
      b = shuffleBag([1, 2, 3], 20, "same", String),
      c = shuffleBag([1, 2, 3], 20, "other", String);
    expect(a).toEqual(b);
    expect(c).not.toEqual(a);
    a.slice(1).forEach((item, index) => expect(item).not.toBe(a[index]));
    const balanced = balancedGenerationBag(
      SPECIES,
      9,
      20,
      "coverage",
      (entry) => String(entry.id),
    );
    expect(new Set(balanced.map((entry) => entry.generation)).size).toBe(9);
  });
  it("builds seeded battle circuits without immediate duplicate opponents", () => {
    const a = generateBattleCircuit(9, 20, 25, "circuit", "medium"),
      b = generateBattleCircuit(9, 20, 25, "circuit", "medium");
    expect(a.map((entry) => entry.id)).toEqual(b.map((entry) => entry.id));
    a.slice(1).forEach((entry, index) =>
      expect(entry.id).not.toBe(a[index].id),
    );
    expect(new Set(a.map((entry) => entry.generation)).size).toBe(9);
  });
  it("keeps practice runs out of the Dex write path", () => {
    expect(shouldRecordDex(false)).toBe(true);
    expect(shouldRecordDex(true)).toBe(false);
  });
  it("unlocks the alternate-art badge only for Special Art or Gold finishes", () => {
    expect(localCardBadgeValue("collector-alt", 1, ["standard"])).toBe(0);
    expect(localCardBadgeValue("collector-alt", 1, ["foil", "holo"])).toBe(0);
    expect(localCardBadgeValue("collector-alt", 1, ["special-art"])).toBe(1);
    expect(localCardBadgeValue("collector-alt", 1, ["gold"])).toBe(1);
  });
  it("scores fast circuit wins higher and applies counters after recovery", () => {
    expect(battleWinReward(100, 1)).toBeGreaterThan(battleWinReward(100, 6));
    expect(recoveryCounterOutcome(20, 100, 30, 25)).toEqual({
      healedHp: 50,
      remainingHp: 25,
    });
  });
  it("varies seeded partner and principal-starter rosters", () => {
    const partnersA = circuitPartners(9, "alpha").map((entry) => entry.id),
      partnersB = circuitPartners(9, "beta").map((entry) => entry.id);
    expect(partnersA).not.toEqual(partnersB);
    expect(
      new Set(circuitPartners(9, "alpha").map((entry) => entry.generation))
        .size,
    ).toBe(9);
    const startersA = expeditionStarterRoster(9, "alpha"),
      startersB = expeditionStarterRoster(9, "beta");
    expect(startersA.map((entry) => entry.id)).not.toEqual(
      startersB.map((entry) => entry.id),
    );
    expect(startersA.map((entry) => entry.types[0]).sort()).toEqual([
      "fire",
      "grass",
      "water",
    ]);
  });
  it("builds active gym trials with deterministic variety and bounded member energy", () => {
    const a = buildGymTrials(20, "gym-seed"),
      b = buildGymTrials(20, "gym-seed"),
      c = buildGymTrials(20, "other-seed");
    expect(a).toEqual(b);
    expect(c).not.toEqual(a);
    expect(a).toHaveLength(20);
    a.slice(1).forEach((trial, index) =>
      expect(trial.type).not.toBe(a[index].type),
    );
    expect(gymMemberUses(20, "medium") * 6).toBeGreaterThanOrEqual(20);
    expect(
      evaluateGymDeployment(["electric"], "water", 0, 4, "medium").success,
    ).toBe(true);
    expect(
      evaluateGymDeployment(["fire"], "water", 3, 4, "medium").points,
    ).toBeLessThan(
      evaluateGymDeployment(["fire"], "water", 0, 4, "medium").points,
    );
  });
  it("keeps branching evolution families as explicit same-depth graph edges", () => {
    const eevee = eligibleEvolutionFamilies(1).find(
      (family) => family.id === "eevee",
    );
    expect(eevee).toBeDefined();
    expect(isBranchingFamily(eevee!)).toBe(true);
    expect(evolutionLevels(eevee!)).toEqual([[133], [134, 135, 136]]);
    const sequence = evolutionFamilySequence(1, 5, "branch-seed");
    expect(sequence).toHaveLength(5);
    expect(sequence.some(isBranchingFamily)).toBe(true);
    sequence
      .slice(1)
      .forEach((family, index) =>
        expect(family.id).not.toBe(sequence[index].id),
      );
  });
  it("requires exactly two valid kept cards", () => {
    const pack = generateBooster(1, "keep");
    expect(validKeepSelection(pack, [pack[0].id, pack[1].id])).toBe(true);
    expect(validKeepSelection(pack, [pack[0].id])).toBe(false);
    expect(validKeepSelection(pack, [pack[0].id, pack[0].id])).toBe(false);
  });
  it("earns credits without spending XP and rejects negative balances", () => {
    const start = emptyPokeProgression();
    const next = applyPokeRun(start, {
      id: "x",
      gameId: "field-scanner",
      score: 900,
      correct: 1,
      total: 1,
      selectedRounds: 5,
      completedRounds: 1,
      normalizedRating: 10,
      difficulty: "medium",
      generationCap: 1,
      durationMs: 1000,
      practice: false,
      speciesIds: [25],
      createdAt: 0,
    });
    expect(next.xp).toBeGreaterThan(start.xp);
    expect(next.researchCredits).toBeGreaterThan(start.researchCredits);
    expect(canSpendCredits(50, 60)).toBe(false);
    expect(canSpendCredits(60, 60)).toBe(true);
    expect(canSpendCredits(60, -1)).toBe(false);
  });
});
