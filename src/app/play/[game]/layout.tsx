import type { Metadata } from "next";
import { getGame } from "@/games/registry";
import { isRetiredGame } from "@/games/retired";
import { translate } from "@/i18n/messages";

/** Per-game titles and descriptions so every game URL has its own search snippet. */
export async function generateMetadata({ params }: { params: Promise<{ game: string }> }): Promise<Metadata> {
  const { game: id } = await params;
  const game = getGame(id);
  if (!game) {
    return { title: isRetiredGame(id) ? translate("en", `games.${id}.name`) : "GeoNerds", robots: { index: false, follow: true } };
  }
  const name = translate("en", `games.${id}.name`);
  const short = translate("en", `games.${id}.short`);
  const title = `${name} – free geography game`;
  return {
    title,
    description: `${short} Play ${name} free in your browser on GeoNerds, in English or German, on phone or desktop.`,
    alternates: { canonical: `/play/${id}` },
    openGraph: { title: `${name} · GeoNerds`, description: short, url: `/play/${id}` },
  };
}

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return children;
}
