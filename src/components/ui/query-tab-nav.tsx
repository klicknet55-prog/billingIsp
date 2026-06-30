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
  /** Nilai tab default: param dihapus dari URL (mis. filter=belum-lunas) */
  defaultTabId?: string;
  className?: string;
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
}: QueryTabNavProps) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useState(active);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setOptimistic(active);
  }, [active]);

  function selectTab(tabId: string) {
    if (tabId === optimistic && !pending) return;

    setOptimistic(tabId);
    const url = buildTabUrl(
      basePath,
      paramKey,
      tabId,
      defaultTabId,
      typeof window !== "undefined" ? window.location.search : ""
    );

    startTransition(() => {
      router.replace(url, { scroll: false });
    });
  }

  return (
    <nav
      className={cn("relative z-10 flex flex-wrap gap-2 border-b pb-2", className)}
      aria-label="Navigasi tab"
    >
      {tabs.map((tab) => {
        const selected = optimistic === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            aria-current={selected ? "page" : undefined}
            onClick={() => selectTab(tab.id)}
            className={cn(
              "inline-flex min-h-10 touch-manipulation select-none items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              selected
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted active:bg-muted/80",
              pending && selected && "opacity-80"
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
