"use client";

import { Search } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchMapPlacesAction } from "@/features/maps/actions";
import type { MapPlaceResult } from "@/lib/integrations/maps/geocoding/types";

export function MapPlaceSearch({
  providerLabel,
  onSelect,
}: {
  providerLabel: string;
  onSelect: (place: MapPlaceResult) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MapPlaceResult[]>([]);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function runSearch() {
    const q = query.trim();
    if (q.length < 3) {
      setError("Minimal 3 karakter.");
      setResults([]);
      return;
    }
    setError("");
    startTransition(async () => {
      const res = await searchMapPlacesAction(q);
      if (res.error) {
        setError(res.error);
        setResults([]);
        setOpen(true);
        return;
      }
      setResults(res.results ?? []);
      setOpen(true);
    });
  }

  function pick(place: MapPlaceResult) {
    onSelect(place);
    setOpen(false);
    setQuery(place.label);
  }

  return (
    <div ref={wrapRef} className="relative w-full md:max-w-md">
      <label className="mb-1 block text-xs text-muted-foreground">
        Cari tempat <span className="text-[10px]">({providerLabel})</span>
      </label>
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              runSearch();
            }
          }}
          placeholder="Desa, kecamatan, kabupaten…"
          className="h-11 min-h-11 flex-1 text-base md:h-9 md:min-h-9 md:text-sm"
        />
        <Button
          type="button"
          variant="outline"
          className="h-11 shrink-0 px-3 md:h-9"
          disabled={pending}
          onClick={runSearch}
        >
          <Search className="size-4" />
          <span className="sr-only">Cari</span>
        </Button>
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      {open && results.length > 0 && (
        <ul className="absolute z-[500] mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-popover py-1 text-sm shadow-md">
          {results.map((r, i) => (
            <li key={`${r.latitude}-${r.longitude}-${i}`}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-muted"
                onClick={() => pick(r)}
              >
                <span className="line-clamp-2">{r.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && !pending && results.length === 0 && !error && query.trim().length >= 3 && (
        <p className="absolute z-[500] mt-1 w-full rounded-md border bg-popover px-3 py-2 text-xs text-muted-foreground shadow-md">
          Tidak ada hasil. Coba nama yang lebih spesifik.
        </p>
      )}
    </div>
  );
}
