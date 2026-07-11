import { describe, expect, it } from "vitest";
import { dexScore, dexStateOf } from "./dex";

describe("Geo-Dex mastery", () => {
  it("keeps fully unlocked and mastered countries discovered", () => {
    expect(dexStateOf({ flags: 5, capitals: 5 })).toBe("unlocked");
    expect(dexStateOf({ flags: 5, capitals: 5 })).not.toBe("locked");
  });

  it("requires twenty hits across four distinct games for mastery", () => {
    expect(dexStateOf({ flags: 20, capitals: 1, trivia: 1 })).toBe("researched");
    expect(dexStateOf({ flags: 5, capitals: 5, trivia: 5, outline: 4 })).toBe("unlocked");
    expect(dexStateOf({ flags: 5, capitals: 5, trivia: 5, outline: 5 })).toBe("mastered");
  });

  it("preserves the capped unlock score", () => {
    expect(dexScore({ flags: 99 })).toBe(5);
  });
});
