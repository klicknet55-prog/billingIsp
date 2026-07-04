"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Cetak halaman invoice (seluruh area print browser). */
export function PrintButton() {
  return (
    <Button onClick={() => window.print()} variant="outline" type="button">
      <Printer /> Cetak / PDF
    </Button>
  );
}
