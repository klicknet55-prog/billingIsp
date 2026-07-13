import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createRouterAction } from "@/features/routers/actions";

export function RouterCreateForm({
  cancelHref,
  onCancel,
  defaults,
}: {
  /** Halaman penuh mobile — error redirect kembali ke sini */
  cancelHref?: string;
  /** Modal desktop — tutup dialog */
  onCancel?: () => void;
  defaults?: {
    ipAddress?: string;
    apiPort?: string;
    connectionMode?: "rest" | "legacy_api";
  };
}) {
  return (
    <form action={createRouterAction} className="grid gap-4 sm:grid-cols-2">
      {cancelHref ? <input type="hidden" name="fromPage" value="tambah" /> : null}
      <div className="space-y-2">
        <Label htmlFor="nama">Nama</Label>
        <Input id="nama" name="nama" required placeholder="Router Pusat" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="connectionMode">Mode Koneksi</Label>
        <Select
          id="connectionMode"
          name="connectionMode"
          defaultValue={defaults?.connectionMode ?? "rest"}
        >
          <option value="rest">REST API (RouterOS v7)</option>
          <option value="legacy_api">Legacy API (8728/8729)</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="ipAddress">IP Address</Label>
        <Input
          id="ipAddress"
          name="ipAddress"
          required
          placeholder="192.168.88.1 atau hostname DDNS"
          defaultValue={defaults?.ipAddress}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="apiPort">Port API / HTTPS</Label>
        <Input id="apiPort" name="apiPort" defaultValue={defaults?.apiPort ?? "443"} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input id="username" name="username" required placeholder="admin" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required />
      </div>
      <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
        {cancelHref ? (
          <Button asChild type="button" variant="ghost" className="min-h-11">
            <Link href={cancelHref}>Batal</Link>
          </Button>
        ) : (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Batal
          </Button>
        )}
        <Button type="submit" className="min-h-11">
          Simpan Router
        </Button>
      </div>
    </form>
  );
}
