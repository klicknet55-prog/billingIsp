import { Badge } from "@/components/ui/badge";
import type { MessageSendLog } from "@/lib/db/schema";
import { formatDate } from "@/lib/utils";

export function HistoryPanel({ logs }: { logs: MessageSendLog[] }) {
  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada riwayat kirim pesan.</p>;
  }

  return (
    <div className="overflow-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="p-2 text-left">Waktu</th>
            <th className="p-2 text-left">Penerima</th>
            <th className="p-2 text-left">Status</th>
            <th className="p-2 text-left">Pesan</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-t align-top">
              <td className="p-2 whitespace-nowrap">{formatDate(log.createdAt)}</td>
              <td className="p-2">
                <div>{log.phone || "—"}</div>
                <div className="text-xs text-muted-foreground">{log.recipientId}</div>
              </td>
              <td className="p-2">
                <Badge variant={log.status === "sent" ? "success" : "destructive"}>
                  {log.status}
                </Badge>
                {log.error && (
                  <p className="mt-1 text-xs text-destructive">{log.error}</p>
                )}
              </td>
              <td className="p-2 max-w-md">
                {log.message ? `${log.message.slice(0, 120)}${log.message.length > 120 ? "…" : ""}` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
