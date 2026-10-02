import { describe, expect, it } from "vitest";
import { initialSession, recordVisualRound, visualResult } from "./session";

describe("finite visual-game result bookkeeping", () => {
  it("records a round once even if a timer and answer race", () => {
    const first = recordVisualRound(initialSession(), 0, 3, true, 150, "DEU");
    const duplicate = recordVisualRound(first, 0, 3, false, 0, "FRA");
    expect(duplicate).toBe(first);
    expect(duplicate.score).toBe(150);
    expect(duplicate.countryHits).toEqual(["DEU"]);
  });

  it("records only correctly identified targets, never decoys or revealed misses", () => {
    let state = initialSession();
    state = recordVisualRound(state, 0, 4, true, 100, "JPN");
    state = recordVisualRound(state, 1, 4, true, 100, "CAN");
    state = recordVisualRound(state, 2, 4, false, 0, "AUT");
    state = recordVisualRound(state, 3, 4, true, 100, "KEN");
    expect(state.countryHits).toEqual(["JPN", "CAN", "KEN"]);
    expect(state.correct).toBe(3);
    expect(state.bestStreak).toBe(2);
    expect(state.streak).toBe(1);
    expect(visualResult(state, 4, 20000, "choice")).toMatchObject({ total: 4, correct: 3, marks: [true, true, false, true], mode: "choice" });
  });

  it("keeps planned totals, zero practice points, and rejects skipped/out-of-range rounds", () => {
    const initial = initialSession();
    expect(recordVisualRound(initial, 2, 10, true, 100, "USA")).toBe(initial);
    expect(recordVisualRound(initial, 0, 0, true, 100, "USA")).toBe(initial);
    const practice = recordVisualRound(initial, 0, 10, true, 0, "USA");
    expect(practice.score).toBe(0);
    expect(visualResult(practice, 10, 1000, "type").total).toBe(10);
  });
});
