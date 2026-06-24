"use client";

import { useEffect } from "react";
import { updateTeknisiLocationAction } from "@/features/tickets/actions";

/** Kirim lokasi GPS teknisi untuk auto-assign tiket berdasarkan jarak. */
export function TeknisiLocationPing() {
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const fd = new FormData();
        fd.set("latitude", String(p.coords.latitude));
        fd.set("longitude", String(p.coords.longitude));
        void updateTeknisiLocationAction(fd);
      },
      () => {},
      { maximumAge: 60_000, timeout: 10_000 }
    );
  }, []);
  return null;
}
