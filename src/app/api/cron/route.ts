import { runBillingCycle } from "@/features/jobs/service";

/**
 * Endpoint cron untuk siklus penagihan otomatis.
 * Lindungi dengan header `Authorization: Bearer <CRON_SECRET>` di production,
 * lalu jadwalkan via Vercel Cron / cron server.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return new Response("Unauthorized", { status: 401 });
    }
  }
  const result = await runBillingCycle();
  return Response.json({ ok: true, ...result });
}
