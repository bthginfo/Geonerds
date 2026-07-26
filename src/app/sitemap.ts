import type { MetadataRoute } from "next";
import { GAMES } from "@/games/registry";
import { WINE_GAMES } from "@/wine/registry";
import { POKE_GAMES } from "@/poke/registry";

const SITE_URL = "https://geo-nerds.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes = ["", "/daily", "/weekly", "/profile", "/collection", "/leaderboard", "/badges", "/how-to", "/settings", "/privacy", "/impressum"].map(
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

  const wineStatic = ["", "/dex", "/leaderboard", "/badges", "/profile"].map((path) => ({
    url: `${SITE_URL}/wine-nerds${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 0.6 : 0.45,
  }));
  const wineGames = WINE_GAMES.map((g) => ({
    url: `${SITE_URL}/wine-nerds/play/${g.id}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.55,
  }));

  const pokeStatic = ["", "/dex", "/cards", "/leaderboard", "/badges", "/profile"].map((path) => ({
    url: `${SITE_URL}/poke-nerds${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 0.6 : 0.45,
  }));
  const pokeGames = POKE_GAMES.map((game) => ({
    url: `${SITE_URL}/poke-nerds/play/${game.id}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.55,
  }));

  return [...staticRoutes, ...gameRoutes, ...wineStatic, ...wineGames, ...pokeStatic, ...pokeGames];
}
