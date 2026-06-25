"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/features/auth/actions";
import { requireUser } from "@/lib/auth";
import {
  getDeployInfo,
  isDeployEnabled,
  isDeployRunning,
  startDeployProcess,
} from "@/features/platform-deploy/service";

export async function startDeployAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser(["superadmin"]);

  if (!isDeployEnabled()) {
    return {
      error:
        "Update dari dashboard dinonaktifkan. Set DEPLOY_ENABLED=true di .env production lalu restart app.",
    };
  }

  if (formData.get("confirm") !== "DEPLOY") {
    return { fieldErrors: { confirm: "Ketik DEPLOY untuk konfirmasi." } };
  }

  if (await isDeployRunning()) {
    return { error: "Deploy sedang berjalan. Tunggu hingga selesai." };
  }

  await startDeployProcess(user.email);
  revalidatePath("/superadmin");
  revalidatePath("/superadmin/deploy");
  return { ok: true };
}

export async function getDeployStatusAction(): Promise<
  Awaited<ReturnType<typeof getDeployInfo>>
> {
  await requireUser(["superadmin"]);
  return getDeployInfo();
}
