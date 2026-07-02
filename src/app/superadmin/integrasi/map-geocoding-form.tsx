"use client";

import { useActionState, useEffect } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { useToast } from "@/components/ui/toast";
import type { ActionState } from "@/features/auth/actions";
import { saveMapGeocodingAction } from "@/features/platform-settings/actions";
import type { MapGeocodingProvider } from "@/lib/integrations/maps/geocoding/types";

const initial: ActionState = {};

export function MapGeocodingForm({
  defaults,
}: {
  defaults: {
    provider: MapGeocodingProvider;
    hasGoogleApiKey: boolean;
    hasEnvGoogleKey: boolean;
  };
}) {
  const [state, action] = useActionState(saveMapGeocodingAction, initial);
  const { toast } = useToast();

  useEffect(() => {
    if (state.ok) toast({ title: "Pengaturan pencarian peta disimpan", variant: "success" });
    if (state.error) toast({ title: state.error, variant: "error" });
  }, [state.ok, state.error, toast]);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Provider pencarian tempat</label>
        <p className="mb-2 text-xs text-muted-foreground">
          Berlaku untuk semua tenant di halaman Peta. Default: Nominatim (gratis).
        </p>
        <select
          name="mapGeocodingProvider"
          defaultValue={defaults.provider}
          className="h-9 w-full max-w-md rounded-md border px-3 text-sm"
        >
          <option value="nominatim">Nominatim (OpenStreetMap) — gratis</option>
          <option value="google">Google Geocoding API</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Google Geocoding API Key</label>
        <input
          name="googleGeocodingApiKey"
          type="password"
          placeholder={
            defaults.hasGoogleApiKey || defaults.hasEnvGoogleKey
              ? "Kosongkan jika tidak diubah"
              : "AIza..."
          }
          className="h-9 w-full max-w-md rounded-md border px-3 text-sm"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Wajib jika mode Google dipilih. Aktifkan Geocoding API di Google Cloud Console. Alternatif:
          set env <code className="rounded bg-muted px-1">GOOGLE_GEOCODING_API_KEY</code>.
          {defaults.hasEnvGoogleKey ? " (env terdeteksi)" : ""}
        </p>
      </div>

      <SubmitButton>Simpan Peta</SubmitButton>
    </form>
  );
}
