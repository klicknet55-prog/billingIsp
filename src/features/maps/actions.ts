"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { clearModemStatusCache } from "./modem-status";
import { getMapPageData } from "./service";

const ISP_ROLES = ["owner", "admin", "teknisi"] as const;

export async function refreshMapStatusAction() {
  const user = await requireUser(ISP_ROLES);
  clearModemStatusCache(user.tenantId!);
  await getMapPageData(user.tenantId!, { bustCache: true });
  revalidatePath("/isp/peta");
}
