"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/features/auth/actions";
import { requireUser } from "@/lib/auth";
import { savePelangganAssignments } from "./service";

const ISP_ROLES = ["owner", "admin"] as const;

const assignmentSchema = z.object({
  pelangganId: z.string().min(1),
  kolektorId: z.string().nullable(),
});

export async function saveKolektorAssignmentsAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser(ISP_ROLES);
  const tenantId = user.tenantId!;

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("assignments") ?? "[]"));
  } catch {
    return { error: "Data penugasan tidak valid." };
  }

  const parsed = z.array(assignmentSchema).safeParse(raw);
  if (!parsed.success) return { error: "Format penugasan tidak valid." };

  const normalized = parsed.data.map((row) => ({
    pelangganId: row.pelangganId,
    kolektorId: row.kolektorId?.trim() || null,
  }));

  try {
    await savePelangganAssignments(tenantId, normalized);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Gagal menyimpan penugasan." };
  }

  revalidatePath("/isp/kolektor-pelanggan");
  revalidatePath("/kolektor");
  return { ok: true };
}
