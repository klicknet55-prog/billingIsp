import { listTagihanForApi } from "@/features/api/v1/service";
import { authenticateApiRequest } from "@/lib/api/auth";
import { parsePageLimit } from "@/lib/api/query";
import { apiListSuccess } from "@/lib/api/response";

export async function GET(req: Request) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const { page, limit, offset } = parsePageLimit(searchParams);

  const { data, total } = await listTagihanForApi(auth.ctx.tenantId, {
    offset,
    limit,
    status: searchParams.get("status"),
    pelangganId: searchParams.get("pelangganId"),
    periode: searchParams.get("periode"),
  });

  return apiListSuccess(data, { page, limit, total });
}
