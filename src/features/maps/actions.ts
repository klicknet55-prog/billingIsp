"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getMapGeocodingProviderLabel, searchMapPlaces } from "@/lib/integrations/maps/geocoding";
import type { MapPlaceResult } from "@/lib/integrations/maps/geocoding/types";
import { clearModemStatusCache } from "./modem-cache";
import { getMapPageData } from "./service";

const ISP_ROLES = ["owner", "admin", "teknisi"] as const;

export async function refreshMapStatusAction() {
  const user = await requireUser(ISP_ROLES);
  await clearModemStatusCache(user.tenantId!);
  await getMapPageData(user.tenantId!, { bustCache: true });
  revalidatePath("/dashboard/peta");
}

export async function searchMapPlacesAction(
  query: string
): Promise<{ results?: MapPlaceResult[]; error?: string }> {
  await requireUser(ISP_ROLES);
  const q = query.trim();
  if (q.length < 3) {
    return { error: "Ketik minimal 3 karakter (desa, kecamatan, kabupaten…)." };
  }
  try {
    const results = await searchMapPlaces(q);
    return { results };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function getMapGeocodingProviderLabelAction(): Promise<string> {
  await requireUser(ISP_ROLES);
  return getMapGeocodingProviderLabel();
}
