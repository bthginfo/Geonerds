import type postgres from "postgres";
import { describe, expect, it } from "vitest";
import { ensureGeoChallengeCommunity } from "./geo-challenge-schema";

describe("All-rounds schema upgrade", () => {
  it("guards the check upgrade inside the existing locked transaction, preserving historical round counts", async () => {
    const queries: string[] = [];
    let transactions = 0;
    const query = async (parts: TemplateStringsArray) => { queries.push(parts.join("?")); return []; };
    const sql = Object.assign(query, { begin: async (work: (tx: typeof query) => Promise<void>) => { transactions++; await work(query); } });
    await ensureGeoChallengeCommunity(sql as unknown as ReturnType<typeof postgres>);
    expect(transactions).toBe(1);
    expect(queries[0]).toContain("pg_advisory_xact_lock");
    const upgrade = queries.find((text) => text.startsWith("DO $$"))!;
    expect(upgrade).toContain("IF NOT EXISTS");
    expect(upgrade).toContain("conrelid='gn_challenges'::regclass");
    expect(upgrade).toContain("DROP CONSTRAINT IF EXISTS gn_challenges_rounds_check");
    expect(upgrade).toContain("ADD CONSTRAINT gn_challenges_rounds_all_check");
    expect(upgrade).toContain("CHECK (rounds IN (0,10,25,50))");
    expect(queries.join("\n")).not.toMatch(/SET\s+rounds|DROP TABLE|DELETE FROM/);
    expect(queries.some((text) => text.includes("DROP CONSTRAINT IF EXISTS gn_challenges_invitation_type_check"))).toBe(true);
    expect(queries.some((text) => text.includes("ADD CONSTRAINT gn_challenges_invitation_type_check") && text.includes("'bot'"))).toBe(true);
    expect(queries.some((text) => text.includes("ADD COLUMN IF NOT EXISTS bot_seed"))).toBe(true);
    expect(queries.some((text) => text.includes("CREATE TABLE IF NOT EXISTS gn_challenge_bot_attempts"))).toBe(true);
  });
});
