"use client";

import { useState } from "react";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NotaDocumentData } from "@/lib/print/nota-document";
import { downloadNotaPdf, printNotaDocument } from "@/lib/print/nota-print-client";

type NotaPrintActionsProps = {
  data: NotaDocumentData;
  documentTitle?: string;
};

export function NotaPrintActions({ data, documentTitle }: NotaPrintActionsProps) {
  const [busy, setBusy] = useState<"print" | "download" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const run = async (action: "print" | "download") => {
    setMessage(null);
    setBusy(action);
    try {
      const result =
        action === "print"
          ? await printNotaDocument(data, documentTitle)
          : await downloadNotaPdf(data);
      if (result.message) setMessage(result.message);
      if (!result.ok && result.message) setMessage(result.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex w-full min-w-0 flex-col items-stretch gap-2 sm:w-auto sm:items-end">
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <Button
          type="button"
          variant="default"
          className="w-full sm:w-auto"
          disabled={busy !== null}
          onClick={() => void run("download")}
        >
          <Download className="shrink-0" />
          {busy === "download" ? "Menyiapkan PDF…" : "Download PDF"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          disabled={busy !== null}
          onClick={() => void run("print")}
        >
          <Printer className="shrink-0" />
          {busy === "print" ? "Menyiapkan cetak…" : "Cetak"}
        </Button>
      </div>
      {message ? (
        <p className="text-right text-xs text-muted-foreground sm:max-w-[18rem]">
          {message}
        </p>
      ) : null}
    </div>
  );
}
