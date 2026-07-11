import { describe, expect, it } from "vitest";
import { BADGES, badgeCategory, badgeTier } from "./badges";

describe("badge metadata integrity", () => {
  it("has stable unique ids and valid derived metadata", () => {
    expect(new Set(BADGES.map((badge) => badge.id)).size).toBe(BADGES.length);
    for (const badge of BADGES) {
      expect(["journey", "skill", "mastery", "collection", "challenge"]).toContain(badgeCategory(badge));
      expect(["bronze", "silver", "gold", "mythic"]).toContain(badgeTier(badge));
    }
  });

  it("contains complete Grid, Minesweeper and mastery chains", () => {
    expect(BADGES.map((badge) => badge.id)).toEqual(expect.arrayContaining(["gridFirst", "gridFlawless", "gridHard", "grid25", "minesFirst", "minesFlawless", "minesHard", "mines25", "dexMaster1", "dexMaster25"]));
  });

  it("never regresses prestige within an increasing milestone chain", () => {
    const byId = new Map(BADGES.map((badge) => [badge.id, badge]));
    const rank = { bronze: 0, silver: 1, gold: 2, mythic: 3 } as const;
    const chains = [
      ["first", "ten", "fifty", "hundred", "marathon", "runs500", "runs1000"],
      ["score1k", "score10k", "score50k", "score100k", "score250k", "score500k", "score1m", "score2m", "score5m"],
      ["bigrun", "megarun", "run7500", "run10k", "run15k"],
      ["streak10", "speedy", "streak25", "streak50b", "streak50", "streak75", "streak100"],
      ["perfect", "perfect5", "perfect10", "perfect25", "perfect25b", "perfect100"],
      ["sampler", "explorer", "allgames", "completionist"],
      ["regular", "loyal", "days30", "days100"],
      ["flags50", "flags200", "flags500"],
      ["capitals50", "capitals150", "capitals300"],
      ["map100", "map250", "map500"],
      ["nerd10", "nerd20", "nerd30"],
      ["dexFirst", "dex25", "dex50", "dex100", "dexAll"],
      ["dexComplete1", "dexUnlock25", "dexUnlock100", "dexUnlockAll"],
      ["gridFirst", "gridFlawless", "gridHard", "grid25"],
      ["minesFirst", "minesFlawless", "minesHard", "mines25"],
    ];
    for (const chain of chains) {
      const tiers = chain.map((id) => rank[badgeTier(byId.get(id)!)]);
      expect(tiers, chain.join(" → ")).toEqual([...tiers].sort((a, b) => a - b));
    }
  });
});
