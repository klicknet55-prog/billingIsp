"use client";

import { useActionState, useEffect, useState } from "react";
import { Copy, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { useToast } from "@/components/ui/toast";
import {
  createTenantVpnAction,
  deleteTenantVpnAction,
  revealTenantVpnPasswordAction,
  toggleTenantVpnAction,
  type VpnActionState,
} from "@/features/tenant-vpn/actions";
import { buildVpnRouterPrefill } from "@/features/tenant-vpn/router-prefill";
import type { VpnPortProbeResult } from "@/features/tenant-vpn/probe";

type VpnRow = {
  id: string;
  label: string | null;
  vpnUsername: string;
  staticIp: string;
  listenPort: number;
  destinationPort: number;
  status: "active" | "disabled";
  portProbe?: VpnPortProbeResult;
};

const initial: VpnActionState = {};

function CopyButton({ value, label }: { value: string; label: string }) {
  const { toast } = useToast();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title={`Salin ${label}`}
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        toast({ title: `${label} disalin`, variant: "success" });
      }}
    >
      <Copy className="size-4" />
    </Button>
  );
}

function VpnPasswordField({ id }: { id: string }) {
  const [state, action, pending] = useActionState(revealTenantVpnPasswordAction, initial);
  const [visible, setVisible] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (state.error) toast({ title: state.error, variant: "error" });
  }, [state.error, toast]);

  const password = state.password ?? "";

  return (
    <div className="flex items-center gap-1">
      <span className="font-mono text-sm">
        {visible && password ? password : "••••••••••••"}
      </span>
      {!password ? (
        <form action={action}>
          <input type="hidden" name="id" value={id} />
          <Button type="submit" variant="ghost" size="sm" disabled={pending}>
            <Eye className="size-4" />
            Tampilkan
          </Button>
        </form>
      ) : (
        <>
          <Button type="button" variant="ghost" size="icon" onClick={() => setVisible((v) => !v)}>
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </Button>
          {visible && password ? <CopyButton value={password} label="Password" /> : null}
        </>
      )}
    </div>
  );
}

function probeBadge(result?: VpnPortProbeResult) {
  if (!result) return null;
  const map: Record<VpnPortProbeResult, { label: string; variant: "success" | "destructive" | "secondary" }> = {
    open: { label: "Port NAT OK", variant: "success" },
    refused: { label: "Port terbuka, backend menolak", variant: "secondary" },
    timeout: { label: "Port NAT timeout", variant: "destructive" },
    error: { label: "Cek port gagal", variant: "destructive" },
  };
  const item = map[result];
  return <Badge variant={item.variant}>{item.label}</Badge>;
}

function VpnCard({
  row,
  publicHost,
  createdPassword,
}: {
  row: VpnRow;
  publicHost: string;
  createdPassword?: string;
}) {
  const endpoint = `${publicHost}:${row.listenPort}`;
  const prefill = buildVpnRouterPrefill(publicHost, row.listenPort, row.destinationPort as 443 | 8728);
  const routerHref = `/dashboard/router/tambah?ip=${encodeURIComponent(prefill.ipAddress)}&port=${encodeURIComponent(prefill.apiPort)}&connectionMode=${prefill.connectionMode}`;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div>
          <CardTitle className="text-base">{row.label || row.vpnUsername}</CardTitle>
          <p className="font-mono text-xs text-muted-foreground">{row.vpnUsername}</p>
        </div>
        <Badge variant={row.status === "active" ? "success" : "secondary"}>
          {row.status === "active" ? "Aktif" : "Nonaktif"}
        </Badge>
        {probeBadge(row.portProbe)}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">IP tunnel (static)</p>
            <p className="font-mono">{row.staticIp}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Endpoint API publik</p>
            <div className="flex items-center gap-1 font-mono">
              {endpoint}
              <CopyButton value={endpoint} label="Endpoint" />
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Password L2TP</p>
            {createdPassword ? (
              <div className="flex items-center gap-1 font-mono text-amber-700 dark:text-amber-400">
                {createdPassword}
                <CopyButton value={createdPassword} label="Password" />
              </div>
            ) : (
              <VpnPasswordField id={row.id} />
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Port NAT → Mikrotik</p>
            <p className="font-mono">
              {row.listenPort} → {row.staticIp}:{row.destinationPort}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Isi router: IP <span className="font-mono">{publicHost}</span>, port{" "}
              <span className="font-mono">{row.listenPort}</span> (bukan {row.destinationPort}).
            </p>
          </div>
        </div>

        <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Setup L2TP client di Mikrotik</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-4">
            <li>Buat interface L2TP client ke server VPN platform.</li>
            <li>Gunakan username & password di atas; IP static tunnel: {row.staticIp}.</li>
            <li>Setelah tunnel aktif, tambahkan router: IP {publicHost}, port {row.listenPort}.</li>
          </ol>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={routerHref}>Tambah router dengan endpoint ini</Link>
          </Button>
          <form action={toggleTenantVpnAction}>
            <input type="hidden" name="id" value={row.id} />
            <input type="hidden" name="enabled" value={row.status === "active" ? "false" : "true"} />
            <Button type="submit" variant="outline" size="sm">
              {row.status === "active" ? "Nonaktifkan" : "Aktifkan"}
            </Button>
          </form>
          <form action={deleteTenantVpnAction}>
            <input type="hidden" name="id" value={row.id} />
            <Button type="submit" variant="ghost" size="sm" className="text-destructive">
              <Trash2 className="size-4" />
              Hapus
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateVpnForm({
  close,
  publicHost,
  onCreated,
}: {
  close: () => void;
  publicHost: string;
  onCreated: (created: NonNullable<VpnActionState["created"]>) => void;
}) {
  const [state, action] = useActionState(createTenantVpnAction, initial);
  const { toast } = useToast();

  useEffect(() => {
    if (state.ok && state.created) {
      onCreated(state.created);
      toast({
        title: "Akun VPN dibuat",
        description: "Simpan password — ditampilkan di kartu akun baru.",
        variant: "success",
      });
      close();
    }
    if (state.error) {
      toast({ title: state.error, variant: "error" });
    }
  }, [state.ok, state.error, state.created, toast, close, onCreated]);

  return (
    <form action={action} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Sistem membuat akun L2TP + port forward NAT ke API Mikrotik. Endpoint publik:{" "}
        <span className="font-mono">{publicHost}:&lt;port&gt;</span>
      </p>
      <div className="space-y-2">
        <Label htmlFor="label">Label (opsional)</Label>
        <Input id="label" name="label" placeholder="Router Cabang 1" maxLength={80} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="destinationPort">Port API Mikrotik</Label>
        <Select id="destinationPort" name="destinationPort" defaultValue="443">
          <option value="443">443 — REST API (RouterOS v7)</option>
          <option value="8728">8728 — Legacy API</option>
        </Select>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={close}>
          Batal
        </Button>
        <SubmitButton>Buat</SubmitButton>
      </div>
    </form>
  );
}

export function VpnPageClient({
  rows,
  quotaText,
  canCreate,
  publicHost,
}: {
  rows: VpnRow[];
  quotaText: string;
  canCreate: boolean;
  publicHost: string;
}) {
  const [lastCreated, setLastCreated] = useState<VpnActionState["created"]>();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Kuota VPN: {quotaText}</p>
        {canCreate ? (
          <Dialog
            trigger={
              <Button size="sm">
                <Plus />
                Buat VPN
              </Button>
            }
            title="Buat Akun VPN Mikrotik"
          >
            {(close) => (
              <CreateVpnForm
                close={close}
                publicHost={publicHost}
                onCreated={setLastCreated}
              />
            )}
          </Dialog>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Belum ada akun VPN. Buat akun untuk menghubungkan Mikrotik via tunnel L2TP.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((row) => (
            <VpnCard
              key={row.id}
              row={row}
              publicHost={publicHost}
              createdPassword={lastCreated?.id === row.id ? lastCreated.password : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
