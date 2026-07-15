"use client";

import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  downloadAuthenticatedUrl,
  openPrintDocumentUrl,
} from "@/lib/mobile/native-download";
import { cn } from "@/lib/utils";

const CUSTOM_VALUE = "custom";

function exportQuery(input: {
  mode: "period" | "custom";
  period: string;
  from: string;
  to: string;
}) {
  const params = new URLSearchParams();
  if (input.mode === "custom") {
    params.set("from", input.from);
    params.set("to", input.to);
  } else {
    params.set("period", input.period);
  }
  return params.toString();
}

export function LaporanDownloadButtons({
  mode,
  period,
  from,
  to,
  className,
}: {
  mode: "period" | "custom";
  period: string;
  from: string;
  to: string;
  className?: string;
}) {
  const qs = exportQuery({ mode, period, from, to });
  const [busy, setBusy] = useState<"pdf" | "xlsx" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const run = async (kind: "pdf" | "xlsx") => {
    setMessage(null);
    setBusy(kind);
    try {
      if (kind === "pdf") {
        const result = await openPrintDocumentUrl(`/dashboard/laporan/print?${qs}`);
        if (result.message) setMessage(result.message);
        if (!result.ok && result.message) setMessage(result.message);
      } else {
        const result = await downloadAuthenticatedUrl({
          pathOrUrl: `/dashboard/laporan/export?format=xlsx&${qs}`,
          filename: `laporan-keuangan.xlsx`,
          title: "Laporan Keuangan",
        });
        if (result.message) setMessage(result.message);
        if (!result.ok && result.message) setMessage(result.message);
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={cn("flex shrink-0 flex-col items-end gap-1", className)}>
      <div className="flex items-center justify-end gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 px-2.5"
          disabled={busy !== null}
          title="Unduh PDF A4"
          onClick={() => void run("pdf")}
        >
          {busy === "pdf" ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
          <span className="hidden sm:inline">PDF</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 px-2.5"
          disabled={busy !== null}
          title="Unduh Excel"
          onClick={() => void run("xlsx")}
        >
          {busy === "xlsx" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="size-4" />
          )}
          <span className="hidden sm:inline">Excel</span>
        </Button>
      </div>
      {message ? (
        <p className="max-w-[14rem] text-right text-[11px] leading-snug text-muted-foreground">
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function LaporanFilters({
  mode,
  period,
  from,
  to,
  options,
  className,
}: {
  mode: "period" | "custom";
  period: string;
  from: string;
  to: string;
  options: { value: string; label: string }[];
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fromValue, setFromValue] = useState(from);
  const [toValue, setToValue] = useState(to);
  const [customOpen, setCustomOpen] = useState(mode === "custom");

  function applyPeriod(next: string) {
    setCustomOpen(false);
    startTransition(() => {
      router.push(`/dashboard/laporan?period=${encodeURIComponent(next)}`);
    });
  }

  function applyCustom(nextFrom: string, nextTo: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(nextTo)) return;
    startTransition(() => {
      const params = new URLSearchParams({ from: nextFrom, to: nextTo });
      router.replace(`/dashboard/laporan?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <div className={cn("flex w-full min-w-0 max-w-full flex-col gap-2", className)}>
      <Select
        id="laporan-period"
        aria-label="Periode laporan"
        value={customOpen ? CUSTOM_VALUE : period}
        disabled={pending}
        className="h-9 w-full min-w-0"
        onChange={(e) => {
          const next = e.target.value;
          if (next === CUSTOM_VALUE) {
            setCustomOpen(true);
            return;
          }
          applyPeriod(next);
        }}
      >
        <option value={CUSTOM_VALUE}>Custom tanggal</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>

      {customOpen && (
        <div className="flex w-full min-w-0 items-center gap-1.5">
          <Input
            id="laporan-from"
            type="date"
            aria-label="Dari tanggal"
            value={fromValue}
            disabled={pending}
            onChange={(e) => {
              const next = e.target.value;
              setFromValue(next);
              if (/^\d{4}-\d{2}-\d{2}$/.test(next) && /^\d{4}-\d{2}-\d{2}$/.test(toValue)) {
                applyCustom(next, toValue);
              }
            }}
            className="h-9 min-w-0 flex-1 basis-0 px-1.5 text-[11px] sm:px-3 sm:text-sm"
          />
          <Input
            id="laporan-to"
            type="date"
            aria-label="Sampai tanggal"
            value={toValue}
            disabled={pending}
            onChange={(e) => {
              const next = e.target.value;
              setToValue(next);
              if (/^\d{4}-\d{2}-\d{2}$/.test(fromValue) && /^\d{4}-\d{2}-\d{2}$/.test(next)) {
                applyCustom(fromValue, next);
              }
            }}
            className="h-9 min-w-0 flex-1 basis-0 px-1.5 text-[11px] sm:px-3 sm:text-sm"
          />
        </div>
      )}
    </div>
  );
}
