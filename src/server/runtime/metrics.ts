import crypto from "crypto";

export let activityLogSequence = 0;

export function nextActivityLogId(prefix = "log") {
  activityLogSequence = (activityLogSequence + 1) % 1000000;
  return prefix + "_" + Date.now() + "_" + process.pid + "_" + activityLogSequence + "_" + crypto.randomUUID().slice(0, 8);
}

export let entityIdSequence = 0;

export function nextEntityId(prefix: string) {
  entityIdSequence = (entityIdSequence + 1) % 1000000;
  return prefix + "-" + Date.now() + entityIdSequence;
}

export type BenchmarkBucket = {
  count: number;
  totalMs: number;
  maxMs: number;
  samples: number[];
};

export const orderCreateBenchmarks = new Map<string, BenchmarkBucket>();
export const persistenceBenchmarks = new Map<string, BenchmarkBucket>();
export const persistQueueStats = { scheduled: 0, coalesced: 0, completed: 0, failed: 0 };

export function recordBenchmark(target: Map<string, BenchmarkBucket>, name: string, startedAt: number) {
  const elapsed = Math.max(0, performance.now() - startedAt);
  const bucket = target.get(name) || { count: 0, totalMs: 0, maxMs: 0, samples: [] };
  bucket.count += 1;
  bucket.totalMs += elapsed;
  bucket.maxMs = Math.max(bucket.maxMs, elapsed);
  bucket.samples.push(elapsed);
  if (bucket.samples.length > 1000) bucket.samples.shift();
  target.set(name, bucket);
  return elapsed;
}

export function benchmarkSnapshot(target: Map<string, BenchmarkBucket>) {
  return [...target.entries()].map(([name, bucket]) => {
    const sorted = [...bucket.samples].sort((a, b) => a - b);
    const p95 = sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] : 0;
    return { name, count: bucket.count, avgMs: Number((bucket.totalMs / Math.max(1, bucket.count)).toFixed(2)), p95Ms: Number(p95.toFixed(2)), maxMs: Number(bucket.maxMs.toFixed(2)) };
  });
}
