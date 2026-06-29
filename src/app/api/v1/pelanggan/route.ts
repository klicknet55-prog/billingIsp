import { listPelangganForApi } from "@/features/api/v1/service";
import { authenticateApiRequest } from "@/lib/api/auth";
import { parsePageLimit } from "@/lib/api/query";
import { apiListSuccess } from "@/lib/api/response";

export async function GET(req: Request) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const { page, limit, offset } = parsePageLimit(searchParams);
  const status = searchParams.get("status");
  const q = searchParams.get("q");

  const { data, total } = await listPelangganForApi(auth.ctx.tenantId, {
    offset,
    limit,
    status,
    q,
  });

  return apiListSuccess(data, { page, limit, total });
}
