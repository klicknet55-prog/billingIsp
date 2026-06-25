/**
 * Background processor untuk kirim pesan massal.
 * Usage: npm run messages:batch -- <batchId>
 */
import { runBatchSend } from "../src/features/messages/send";

const batchId = process.argv[2] ?? process.env.MESSAGE_BATCH_ID;
if (!batchId) {
  console.error("Batch ID wajib.");
  process.exit(1);
}

runBatchSend(batchId)
  .then(() => {
    console.log(`Batch ${batchId} selesai.`);
  })
  .catch((err) => {
    console.error(`Batch ${batchId} gagal:`, err);
    process.exitCode = 1;
  });
