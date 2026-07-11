import { describe, expect, it, vi } from "vitest";
import { clearGameplayStorage, GAMEPLAY_STORAGE_KEYS } from "./reset";

describe("complete gameplay reset", () => {
  it("removes every persisted gameplay store", () => {
    const removeItem = vi.fn();
    clearGameplayStorage({ removeItem });
    expect(removeItem.mock.calls.map(([key]) => key)).toEqual([...GAMEPLAY_STORAGE_KEYS]);
    expect(GAMEPLAY_STORAGE_KEYS).toEqual(expect.arrayContaining(["geonerds-dex", "geonerds-progression", "geonerds-daily", "geonerds-weekly"]));
  });
});
