import { getRouterStatusSnapshot } from "@/features/routers/service";
import { authenticateApiRequest } from "@/lib/api/auth";
import { apiError, apiSuccess } from "@/lib/api/response";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const snapshot = await getRouterStatusSnapshot(auth.ctx.tenantId, id);
  if (!snapshot) return apiError(404, "NOT_FOUND", "Router tidak ditemukan.");

  return apiSuccess({
    online: snapshot.online,
    lastCheck: snapshot.lastCheck,
    activeSessions: snapshot.activeSessions,
    uptime: snapshot.uptime,
  });
}
