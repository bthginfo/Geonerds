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
  });
});
