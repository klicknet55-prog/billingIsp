"use client";

import { useActionState, useEffect, useState } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { useToast } from "@/components/ui/toast";
import type { ActionState } from "@/features/auth/actions";
import { uploadMobileApkAction } from "@/features/mobile-apk/actions";
import { buildApkReleaseFilename } from "@/lib/mobile/apk-filename";
import { MOBILE_APP_NAMES } from "@/lib/mobile/app-names";

const initial: ActionState = {};

function ApkUploadCard({
  app,
  appOrigin,
  currentUrl,
}: {
  app: "admin" | "portal";
  appOrigin: string;
  currentUrl: string | null;
}) {
  const [state, action] = useActionState(uploadMobileApkAction, initial);
  const { toast } = useToast();
  const [lastApp, setLastApp] = useState<"admin" | "portal" | null>(null);
  const releaseName = buildApkReleaseFilename({ origin: appOrigin, app });
  const appLabel = MOBILE_APP_NAMES[app];

  useEffect(() => {
    if (state.ok && lastApp === app) {
      toast({
        title: `${appLabel} diunggah`,
        description: `Link Community diperbarui (${releaseName}).`,
        variant: "success",
      });
    }
    if (state.error && lastApp === app) {
      toast({ title: state.error, variant: "error" });
    }
  }, [state.ok, state.error, lastApp, app, appLabel, releaseName, toast]);

  return (
    <form
      action={action}
      className="space-y-4 rounded-lg border p-4"
      onSubmit={() => setLastApp(app)}
    >
      <input type="hidden" name="app" value={app} />
      <div>
        <h3 className="font-medium">{appLabel}</h3>
        <p className="mt-1 break-all text-xs text-muted-foreground">
          Nama file release: <code className="rounded bg-muted px-1">{releaseName}</code>
        </p>
      </div>
      {currentUrl && (
        <p className="text-xs text-muted-foreground break-all">
          Link aktif:{" "}
          <a href={currentUrl} target="_blank" rel="noreferrer" className="underline">
            {currentUrl}
          </a>
        </p>
      )}
      <div>
        <label htmlFor={`apk-${app}`} className="mb-1 block text-sm font-medium">
          File APK
        </label>
        <input
          id={`apk-${app}`}
          name="apk"
          type="file"
          accept=".apk,application/vnd.android.package-archive"
          required
          className="block w-full rounded-md border p-2 text-sm"
        />
        <p className="mt-1 text-xs text-muted-foreground">Maks. 80 MB. Format .apk</p>
      </div>
      <SubmitButton>Unggah {appLabel}</SubmitButton>
    </form>
  );
}

export function MobileApkUploadPanel({
  appOrigin,
  communityApkAdminUrl,
  communityApkPortalUrl,
}: {
  appOrigin: string;
  communityApkAdminUrl: string | null;
  communityApkPortalUrl: string | null;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ApkUploadCard app="admin" appOrigin={appOrigin} currentUrl={communityApkAdminUrl} />
      <ApkUploadCard app="portal" appOrigin={appOrigin} currentUrl={communityApkPortalUrl} />
    </div>
  );
}
