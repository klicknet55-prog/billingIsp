"use client";

import { TENANT_OWNER_PLACEHOLDERS, placeholderToken } from "@/features/messages/placeholders";

export function TenantPlaceholderList({
  onInsert,
}: {
  onInsert?: (token: string) => void;
}) {
  return (
    <div className="space-y-2 rounded-lg border bg-muted/20 p-3 text-sm">
      <p className="font-medium">Placeholder</p>
      <ul className="space-y-1">
        {TENANT_OWNER_PLACEHOLDERS.map((p) => (
          <li key={p.key} className="flex items-start justify-between gap-2">
            <span>
              <code className="rounded bg-muted px-1">{placeholderToken(p.key)}</code>
              <span className="ml-1 text-muted-foreground">— {p.label}</span>
            </span>
            {onInsert && (
              <button
                type="button"
                className="shrink-0 text-xs text-primary hover:underline"
                onClick={() => onInsert(placeholderToken(p.key))}
              >
                Sisip
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
