import { describe, expect, it } from "vitest";
import type postgres from "postgres";
import { ensureCommunityRewards } from "./community-rewards-schema";

describe("community release migration", () => {
  it("binds a reviewed submission to its real account and grants each reward only once", async () => {
    const calls: { text: string; values: unknown[] }[] = [];
    const query = async (parts: TemplateStringsArray, ...values: unknown[]) => {
      calls.push({ text: parts.join("?"), values }); return [];
    };
    const sql = Object.assign(query, { begin: async (work: (tx: typeof query) => Promise<unknown>) => work(query) });
    await ensureCommunityRewards(sql as unknown as ReturnType<typeof postgres>);
    const grants = calls.filter((call) => call.text.includes("WITH contributor"));
    expect(grants).toHaveLength(2);
    for (const call of grants) {
      expect(call.text).toContain("JOIN gn_users u ON u.id=f.user_id");
      expect(call.text).toContain("strpos(lower(f.message),?)>0");
      expect(call.values).toContain("adastra1995");
      expect(call.values).toContain("adastra");
      expect(call.text).toContain("DO NOTHING");
    }
    expect(grants[0].text).toContain("ON CONFLICT (user_id,badge_id)");
    expect(grants[1].text).toContain("ON CONFLICT (user_id,kind,game_id)");
    expect(grants[1].text).not.toContain("read_at=");
  });
});
