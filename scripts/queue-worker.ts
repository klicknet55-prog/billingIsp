import { startQueueWorker, stopQueueWorker } from "../src/lib/queue/workers/index";

startQueueWorker();

async function shutdown(signal: string) {
  console.log(`[queue-worker] ${signal} — shutting down…`);
  await stopQueueWorker();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

console.log("[queue-worker] Ready. Waiting for jobs…");
