/** Combinatorial games deal a finite practice pack, not "all" permutations. */
export function packCount(count: number): number {
  return count === 0 ? 25 : Number.isFinite(count) && count > 0 ? Math.max(1, Math.min(50, Math.floor(count))) : 5;
}

export function finiteCount(count: number, available: number): number {
  return count === 0 ? available : Math.min(packCount(count), available);
}
