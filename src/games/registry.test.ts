import { describe, expect, it } from "vitest";
import { GAMES } from "./registry";

describe("game registry editorial order", () => {
  it("keeps Flag Quiz first on Home", () => {
    expect(GAMES[0].id).toBe("flags");
  });

  it("places Geo Grid at the requested middle position", () => {
    expect(GAMES[11].id).toBe("grid");
    expect(GAMES[12].id).toBe("minesweeper");
  });
});
