import { countryDiscoveryPresentation } from "@/lib/country-discovery";

export const dynamic = "force-static";

/**
 * Reward data is intentionally loaded only by a player who has reached the
 * canonical Geo-Dex unlock state on the client. Keeping it behind this route
 * prevents dish names and country SVG paths from riding along with the initial
 * collection bundle for partially discovered countries.
 */
export async function GET(_request: Request, context: { params: Promise<{ cca3: string }> }) {
  const { cca3 } = await context.params;
  const reward = countryDiscoveryPresentation(cca3.toUpperCase(), "unlocked");
  if (!reward) return Response.json({ error: "Unknown country" }, { status: 404 });
  return Response.json(reward, {
    // Never immutable: this content is edited over time, and clients that
    // cached an immutable response only refresh when the URL version bumps
    // (see DISCOVERY_CONTENT_VERSION).
    headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
  });
}
