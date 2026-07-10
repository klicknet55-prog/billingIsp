"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/features/auth/actions";
import { patchPlatformSettings } from "@/features/platform-settings/service";
import { requireUser } from "@/lib/auth";
import {
  buildApkReleaseFilename,
  hostnameFromOrigin,
  type MobileApkApp,
} from "@/lib/mobile/apk-filename";
import { MOBILE_APP_NAMES } from "@/lib/mobile/app-names";
import { resolveAppOrigin } from "@/lib/site";
import { PLATFORM_REVALIDATE_PATHS } from "@/lib/superadmin-pengaturan-nav";
import { saveApkUpload } from "@/lib/uploads";

function revalidateAfterApkUpload() {
  for (const p of PLATFORM_REVALIDATE_PATHS) {
    revalidatePath(p);
  }
  revalidatePath("/superadmin/mobile-apk");
}

export async function uploadMobileApkAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireUser(["superadmin"]);

  const appRaw = String(formData.get("app") ?? "");
  if (appRaw !== "admin" && appRaw !== "portal") {
    return { error: "Pilih jenis aplikasi (Admin.net atau MyWiFi)." };
  }
  const app = appRaw as MobileApkApp;

  const file = formData.get("apk");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "File APK wajib dipilih." };
  }

  const origin = resolveAppOrigin();
  if (!origin) {
    return {
      error: "NEXT_PUBLIC_APP_URL belum dikonfigurasi. Set di .env production lalu restart app.",
    };
  }

  try {
    const filename = buildApkReleaseFilename({ origin, app });
    const relativePath = await saveApkUpload(file, filename);
    const publicUrl = `${origin}${relativePath}`;

    await patchPlatformSettings(
      app === "admin"
        ? { communityApkAdminUrl: publicUrl }
        : { communityApkPortalUrl: publicUrl }
    );

    revalidateAfterApkUpload();
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Gagal mengunggah APK." };
  }
}
