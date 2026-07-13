"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "nm_balance_visible";

export function useBalanceVisibility(defaultVisible = true) {
  const [visible, setVisible] = useState(defaultVisible);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored === "0") setVisible(false);
      if (stored === "1") setVisible(true);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    setVisible((v) => {
      const next = !v;
      try {
        sessionStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return { visible, toggle };
}
