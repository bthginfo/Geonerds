import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GeoNerds — Geography Games",
    short_name: "GeoNerds",
    description:
      "Free geography quizzes and games: flags, capitals, country shapes, rivers and more.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f8fb",
    theme_color: "#6366f1",
    categories: ["games", "education"],
    lang: "en",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
