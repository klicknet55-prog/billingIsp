/**
 * Smoke test cache modem: N kali baca cache tanpa bust (harus hit cache setelah pertama).
 * Usage: node --env-file=.env --import tsx scripts/map-cache-load-test.ts <tenantId> [concurrency]
 */
import { getMapPageData } from "../src/features/maps/service";

const tenantId = process.argv[2];
const concurrency = Math.max(1, Number(process.argv[3] ?? 10) || 10);

if (!tenantId) {
  console.error("Usage: map-cache-load-test.ts <tenantId> [concurrency]");
  process.exit(1);
}

async function runOnce(label: string) {
  const start = Date.now();
  await getMapPageData(tenantId);
  return { label, ms: Date.now() - start };
}

console.log(`Load test peta tenant=${tenantId} concurrency=${concurrency}`);

const cold = await runOnce("cold");
console.log("cold", cold);

const warm = await Promise.all(
  Array.from({ length: concurrency }, (_, i) => runOnce(`warm-${i + 1}`))
);
const avg = warm.reduce((s, r) => s + r.ms, 0) / warm.length;
console.log(`warm avg=${avg.toFixed(0)}ms min=${Math.min(...warm.map((w) => w.ms))}ms max=${Math.max(...warm.map((w) => w.ms))}ms`);
console.log(avg < cold.ms * 0.8 ? "PASS: warm requests faster (cache likely hit)" : "NOTE: warm not much faster — check Redis/Mikrotik mock");
