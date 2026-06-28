import { describe, expect, it } from "vitest";
import { matchAnswer, normalize, allowedTypos } from "./fuzzy";

describe("normalize", () => {
  it("lowercases, strips accents and articles", () => {
    expect(normalize("The Gambia")).toBe("gambia");
    expect(normalize("Côte d'Ivoire")).toBe("cote d ivoire");
    expect(normalize("  España ")).toBe("espana");
  });
});

describe("allowedTypos", () => {
  it("scales with length", () => {
    expect(allowedTypos(4)).toBe(1);
    expect(allowedTypos(10)).toBe(2);
    expect(allowedTypos(40)).toBe(4);
  });
});

describe("matchAnswer", () => {
  const germany = ["Germany", "Deutschland"];

  it("accepts exact matches", () => {
    expect(matchAnswer("Germany", germany).status).toBe("correct");
    expect(matchAnswer("Deutschland", germany).status).toBe("correct");
  });

  it("tolerates small typos", () => {
    expect(matchAnswer("Germny", germany).status).toBe("correct");
    expect(matchAnswer("germeny", germany).status).toBe("correct");
    expect(matchAnswer("deutschlnd", germany).status).toBe("correct");
  });

  it("ignores case and accents", () => {
    expect(matchAnswer("GERMANY", germany).status).toBe("correct");
  });

  it("matches spaced names without spaces", () => {
    expect(matchAnswer("unitedstates", ["United States"]).status).toBe("correct");
  });

  it("rejects clearly different countries", () => {
    expect(matchAnswer("France", germany).status).toBe("wrong");
  });

  it("does not confuse Niger and Nigeria", () => {
    expect(matchAnswer("Nigeria", ["Niger"]).status).not.toBe("correct");
    expect(matchAnswer("Niger", ["Nigeria"]).status).not.toBe("correct");
  });

  it("offers a near suggestion for close-but-not-quite", () => {
    const res = matchAnswer("Azerbaijhann", ["Azerbaijan"]);
    expect(["near", "correct"]).toContain(res.status);
    expect(res.suggestion).toBe("Azerbaijan");
  });
});
