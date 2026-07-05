"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteResolvedTicketAction } from "@/features/tickets/actions";

export function TicketDeleteButton({ ticketId }: { ticketId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-destructive hover:text-destructive"
      disabled={pending}
      onClick={() => {
        if (!confirm("Hapus tiket yang sudah selesai? Tindakan ini tidak bisa dibatalkan.")) {
          return;
        }
        startTransition(() => {
          void deleteResolvedTicketAction(ticketId);
        });
      }}
    >
      {pending ? "..." : "Hapus"}
    </Button>
  );
}
