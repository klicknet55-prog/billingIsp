"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { cn } from "@/lib/utils";

export type QueryTabItem = {
  id: string;
  label: string;
};

type QueryTabNavProps = {
  tabs: readonly QueryTabItem[];
  active: string;
  /** Path tanpa query, mis. `/dashboard/pesan` */
  basePath: string;
  /** Nama query param — default `tab` */
  paramKey?: string;
  /** Nilai tab default: param dihapus dari URL */
  defaultTabId?: string;
  className?: string;
  /**
   * client = ganti tab instan tanpa reload server (disarankan jika data sudah di-load).
   * navigate = soft navigation + refresh RSC.
   */
  mode?: "client" | "navigate";
  onTabChange?: (tabId: string) => void;
};

function buildTabUrl(
  basePath: string,
  paramKey: string,
  tabId: string,
  defaultTabId: string | undefined,
  currentSearch: string
) {
  const params = new URLSearchParams(currentSearch);
  params.delete("error");
  params.delete("success");
  params.delete("msg");

  if (defaultTabId && tabId === defaultTabId) {
    params.delete(paramKey);
  } else {
    params.set(paramKey, tabId);
  }

  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function QueryTabNav({
  tabs,
  active,
  basePath,
  paramKey = "tab",
  defaultTabId,
  className,
  mode = "navigate",
  onTabChange,
}: QueryTabNavProps) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useState(active);
  const [localActive, setLocalActive] = useState(active);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setLocalActive(active);
  }, [active]);

  useEffect(() => {
    if (mode === "client") return;
    if (!pending) {
      setOptimistic(active);
    }
  }, [active, pending, mode]);

  const displayActive = mode === "client" ? localActive : optimistic;

  function selectTab(tabId: string) {
    if (tabId === displayActive && !pending) return;

    if (mode === "client") {
      // State lokal dulu agar highlight tab langsung; hindari replaceState yang
      // memicu sinkronisasi router Next.js di production (race → klik terasa 2x).
      setLocalActive(tabId);
      onTabChange?.(tabId);
      return;
    }

    setOptimistic(tabId);
    const url = buildTabUrl(
      basePath,
      paramKey,
      tabId,
      defaultTabId,
      typeof window !== "undefined" ? window.location.search : ""
    );

    startTransition(() => {
      router.push(url, { scroll: false });
      router.refresh();
    });
  }

  return (
    <nav
      role="tablist"
      className={cn("relative z-10 flex flex-wrap gap-2 border-b pb-2", className)}
      aria-label="Navigasi tab"
    >
      {tabs.map((tab) => {
        const selected = displayActive === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-current={selected ? "page" : undefined}
            onClick={() => selectTab(tab.id)}
            className={cn(
              "inline-flex min-h-10 touch-manipulation select-none items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              selected
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground active:bg-muted/80 [@media(hover:hover)]:hover:bg-muted",
              pending && selected && mode === "navigate" && "opacity-80"
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
