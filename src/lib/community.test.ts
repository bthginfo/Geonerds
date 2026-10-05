import { describe, expect, it } from "vitest";
import { FEEDBACK_MAX_LENGTH, parseFeedbackMessage, validSubmissionId } from "./community";

describe("community input validation", () => {
  it("normalizes plain-text feedback while preserving paragraphs", () => {
    expect(parseFeedbackMessage("  More islands please!\r\nAnd capital clues.  ")).toBe("More islands please!\nAnd capital clues.");
  });
  it("rejects empty, short, non-text and oversized submissions", () => {
    for (const input of [null, undefined, {}, [], 123, "", "   ", "hello", "a".repeat(FEEDBACK_MAX_LENGTH + 1)]) {
      expect(parseFeedbackMessage(input)).toBeNull();
    }
    expect(parseFeedbackMessage("a".repeat(FEEDBACK_MAX_LENGTH))).toHaveLength(FEEDBACK_MAX_LENGTH);
  });
  it("rejects hidden control characters but permits normal tabs and Unicode", () => {
    expect(parseFeedbackMessage("More games\u0000 please")).toBeNull();
    expect(parseFeedbackMessage("Mehr Länder\t🗺️ und Rätsel!")).toBe("Mehr Länder\t🗺️ und Rätsel!");
  });
  it("retains literal HTML as text instead of accepting a structured HTML field", () => {
    expect(parseFeedbackMessage("<img src=x onerror=alert(1)> Add more games")).toContain("<img");
  });
  it("only accepts bounded random UUID v4 submission keys", () => {
    expect(validSubmissionId("D462C382-7375-4EC3-AF44-612EC184B949")).toBe(true);
    for (const input of [undefined, "random", "../../admin", "d462c382-7375-1ec3-af44-612ec184b949", "d462c382-7375-4ec3-0f44-612ec184b949"]) {
      expect(validSubmissionId(input)).toBe(false);
    }
  });
});
