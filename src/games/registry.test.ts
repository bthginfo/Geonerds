import { describe, expect, it } from "vitest";
import { GAMES } from "./registry";

describe("game registry editorial order", () => {
  it("keeps Flag Quiz first on Home", () => {
    expect(GAMES[0].id).toBe("flags");
  });
});
