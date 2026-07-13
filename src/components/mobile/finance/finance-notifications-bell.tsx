"use client";

import { Bell, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listMobileNotificationsAction } from "@/features/notifications/actions";
import type { MobileNotificationItem } from "@/features/notifications/notification-feed";

const SEEN_KEY = (app: string) => `nm-notif-last-seen-${app}`;

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function unreadCount(items: MobileNotificationItem[], lastSeen: string | null) {
  if (!lastSeen) return items.length;
  const seenMs = new Date(lastSeen).getTime();
  return items.filter((n) => new Date(n.createdAt).getTime() > seenMs).length;
}

export function FinanceNotificationsBell({ app }: { app: "admin" | "portal" }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MobileNotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLastSeen(localStorage.getItem(SEEN_KEY(app)));
  }, [app]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listMobileNotificationsAction({ app });
      if (res.ok) setItems(res.items);
    } finally {
      setLoading(false);
    }
  }, [app]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const badge = useMemo(() => unreadCount(items, lastSeen), [items, lastSeen]);

  const openPanel = () => {
    setOpen(true);
    const now = new Date().toISOString();
    localStorage.setItem(SEEN_KEY(app), now);
    setLastSeen(now);
    void load();
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={openPanel}
        aria-label="Notifikasi"
        aria-expanded={open}
        className="relative flex size-10 items-center justify-center rounded-full bg-white/15 active:bg-white/25"
      >
        <Bell className="size-5" />
        {badge > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Notifikasi"
          className="absolute right-0 top-[calc(100%+0.35rem)] z-[200] w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg"
        >
          <div className="flex items-center justify-between border-b px-3 py-2">
            <h2 className="text-sm font-semibold">Notifikasi</h2>
            <button
              type="button"
              aria-label="Tutup"
              onClick={() => setOpen(false)}
              className="inline-flex size-8 items-center justify-center rounded-full hover:bg-muted"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto p-2">
            {loading && items.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Memuat...</p>
            ) : items.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                <p>Belum ada notifikasi.</p>
                <p className="mt-1.5 leading-snug">
                  Peringatan langganan dan event billing/tiket akan muncul di sini.
                </p>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {items.map((item) => {
                  const inner = (
                    <>
                      <p className="text-xs font-medium leading-snug">{item.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                        {item.body}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {formatWhen(item.createdAt)}
                      </p>
                    </>
                  );

                  return (
                    <li key={item.id}>
                      {item.href ? (
                        <Link
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className="block rounded-lg border bg-card p-2 active:bg-muted/60"
                        >
                          {inner}
                        </Link>
                      ) : (
                        <div className="rounded-lg border bg-card p-2">{inner}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
