/**
 * Stable, deterministic hash of `seed` mapped to an integer in [0, 99].
 * Same seed always yields the same bucket — required for consistent rollouts.
 */
export function stablePercent(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 100;
}
