import { getPelangganForApi } from "@/features/api/v1/service";
import { authenticateApiRequest } from "@/lib/api/auth";
import { apiError, apiSuccess } from "@/lib/api/response";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const row = await getPelangganForApi(auth.ctx.tenantId, id);
  if (!row) return apiError(404, "NOT_FOUND", "Pelanggan tidak ditemukan.");

  return apiSuccess(row);
}
