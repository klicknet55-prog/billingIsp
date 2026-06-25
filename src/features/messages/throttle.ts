export function getThrottleConfig() {
  return {
    delayMinMs: Number(process.env.WA_SEND_DELAY_MIN_MS ?? 1000),
    delayMaxMs: Number(process.env.WA_SEND_DELAY_MAX_MS ?? 3000),
    batchSize: Number(process.env.WA_SEND_BATCH_SIZE ?? 10),
    batchPauseMs: Number(process.env.WA_SEND_BATCH_PAUSE_MS ?? 30000),
  };
}

export function randomDelayMs(): number {
  const { delayMinMs, delayMaxMs } = getThrottleConfig();
  const min = Math.min(delayMinMs, delayMaxMs);
  const max = Math.max(delayMinMs, delayMaxMs);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Random delay sebelum kirim satu pesan. */
export async function waitBeforeSend(): Promise<void> {
  await sleep(randomDelayMs());
}

/** Pause batch setelah pesan ke-N (10, 20, …). */
export async function paceAfterSend(sentCount: number): Promise<void> {
  const { batchSize, batchPauseMs } = getThrottleConfig();
  if (sentCount > 0 && sentCount % batchSize === 0) {
    await sleep(batchPauseMs);
  }
}
