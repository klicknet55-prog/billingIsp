import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { Pelanggan } from "@/lib/db/schema";

interface Option {
  id: string;
  label: string;
}

function dateValue(d: Date | null | undefined): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

export function PelangganFields({
  defaults,
  paketOptions,
  routerOptions,
}: {
  defaults?: Pelanggan;
  paketOptions: Option[];
  routerOptions: Option[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="nama">Nama</Label>
        <Input id="nama" name="nama" defaultValue={defaults?.nama} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="noWa">No. WhatsApp</Label>
        <Input id="noWa" name="noWa" defaultValue={defaults?.noWa} placeholder="0812xxxx" required />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="alamat">Alamat</Label>
        <Input id="alamat" name="alamat" defaultValue={defaults?.alamat ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="latitude">Latitude</Label>
        <Input
          id="latitude"
          name="latitude"
          type="number"
          step="any"
          defaultValue={defaults?.latitude ?? ""}
          placeholder="-6.2"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="longitude">Longitude</Label>
        <Input
          id="longitude"
          name="longitude"
          type="number"
          step="any"
          defaultValue={defaults?.longitude ?? ""}
          placeholder="106.8"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ipAddress">IP Address</Label>
        <Input id="ipAddress" name="ipAddress" defaultValue={defaults?.ipAddress ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tglJatuhTempo">Jatuh Tempo</Label>
        <Input
          id="tglJatuhTempo"
          name="tglJatuhTempo"
          type="date"
          defaultValue={dateValue(defaults?.tglJatuhTempo)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="paketInternetId">Paket Internet</Label>
        <Select id="paketInternetId" name="paketInternetId" defaultValue={defaults?.paketInternetId ?? ""}>
          <option value="">- Pilih paket -</option>
          {paketOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="routerId">Router</Label>
        <Select id="routerId" name="routerId" defaultValue={defaults?.routerId ?? ""}>
          <option value="">- Pilih router -</option>
          {routerOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
