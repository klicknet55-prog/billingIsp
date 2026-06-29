import { listRoutersForApi } from "@/features/api/v1/service";
import { authenticateApiRequest } from "@/lib/api/auth";
import { apiSuccess } from "@/lib/api/response";

export async function GET(req: Request) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return auth.response;

  const data = await listRoutersForApi(auth.ctx.tenantId);
  return apiSuccess(data);
}
