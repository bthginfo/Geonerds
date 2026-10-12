import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BADGES } from "@/lib/badges";
import { PublicProfileBadges, publicBadgeDefinitions, publicBadgeDescription } from "./public-profile-badges";

describe("public profile badge presentation", () => {
  it("shows only supplied known IDs, deduplicating them and putting community awards before prestige", () => {
    const badges = publicBadgeDefinitions(["first", "future-unknown", "game-creator", "score1m", "contributor", "fifty", "first"], "en");
    expect(badges.map((badge) => badge.id)).toEqual(["contributor", "game-creator", "score1m", "fifty", "first"]);
    expect(publicBadgeDefinitions([], "en")).toEqual([]);
  });

  it("describes community awards as the viewed player's contribution in both languages", () => {
    for (const badge of publicBadgeDefinitions(["contributor", "game-creator"], "en")) {
      expect(publicBadgeDescription(badge, "Atlas", "en")).toContain("Atlas");
      expect(publicBadgeDescription(badge, "Atlas", "en")).not.toContain("Your");
      expect(publicBadgeDescription(badge, "Atlas", "de")).toContain("Atlas");
      expect(publicBadgeDescription(badge, "Atlas", "de")).not.toContain("Deine");
    }
  });

  it("renders award-only profiles without needing runs or any viewer-owned progress", () => {
    const html = renderToStaticMarkup(createElement(PublicProfileBadges, { profileName: "Atlas", badgeIds: ["contributor", "game-creator"], locale: "de" }));
    expect(html).toContain("Verdiente Badges");
    expect(html).toContain("Contributor");
    expect(html).toContain("Game Creator");
    expect(html).toContain("Gold");
    expect(html).toContain("gespeicherter Kontoaktivität");
    expect(html.match(/<li\b/g)).toHaveLength(2);
  });

  it("shows a neutral empty state and never renders unknown badge IDs", () => {
    const html = renderToStaticMarkup(createElement(PublicProfileBadges, { profileName: "Atlas", badgeIds: ["future-unknown"], locale: "en" }));
    expect(html).toContain("No public badges are visible");
    expect(html).toContain("stored only on a device");
    expect(html).not.toContain("future-unknown");
    expect(html).not.toContain("Show all");
  });

  it("initially renders six earned badges and offers access to all remaining badges", () => {
    const badgeIds = BADGES.slice(0, 9).map((badge) => badge.id);
    const html = renderToStaticMarkup(createElement(PublicProfileBadges, { profileName: "Atlas", badgeIds, locale: "en" }));
    expect(html.match(/<li\b/g)).toHaveLength(6);
    expect(html).toContain("Show all 9 badges");
    expect(html).toContain('aria-expanded="false"');
  });
});
