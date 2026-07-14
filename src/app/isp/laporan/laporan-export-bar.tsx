"use client";

import { FileSpreadsheet, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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

  return (
    <div className={cn("flex shrink-0 items-center justify-end gap-1.5", className)}>
      <Button asChild variant="outline" size="sm" className="h-9 px-2.5">
        <a
          href={`/dashboard/laporan/print?${qs}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Unduh PDF A4"
        >
          <FileText className="size-4" />
          <span className="hidden sm:inline">PDF</span>
        </a>
      </Button>
      <Button asChild variant="outline" size="sm" className="h-9 px-2.5">
        <a href={`/dashboard/laporan/export?format=xlsx&${qs}`} title="Unduh Excel A4">
          <FileSpreadsheet className="size-4" />
          <span className="hidden sm:inline">Excel</span>
        </a>
      </Button>
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
  /** True saat dropdown Custom aktif — jangan remount saat ganti bulan di kalender. */
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
            // Hanya tampilkan input tanggal; filter diterapkan setelah tanggal dipilih.
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
              // Terapkan filter hanya setelah tanggal valid terpilih (input lengkap).
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
