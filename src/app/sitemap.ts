import type { MetadataRoute } from "next";
import { GAMES } from "@/games/registry";

const SITE_URL = "https://geonerds-nine.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes = ["", "/leaderboard", "/badges", "/how-to", "/settings", "/privacy", "/impressum"].map(
    (path) => ({
      url: `${SITE_URL}${path}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.6,
    })
  );

  const gameRoutes = GAMES.map((g) => ({
    url: `${SITE_URL}/play/${g.id}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...gameRoutes];
}
