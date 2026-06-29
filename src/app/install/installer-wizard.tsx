"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Database,
  Server,
  User,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  checkRequirementsAction,
  createSuperadminAction,
  finishInstallAction,
  generateAuthSecretAction,
  runDataSetupAction,
  runSchemaMigrationAction,
  saveInstallEnvAction,
  uploadSqliteBackupAction,
} from "@/features/install/actions";
import type { DataSourceMode, RequirementCheck } from "@/features/install/types";

const STEPS = [
  { id: "requirements", label: "Requirement", icon: Server },
  { id: "env", label: "Environment", icon: Database },
  { id: "schema", label: "Schema DB", icon: Database },
  { id: "data", label: "Data", icon: Upload },
  { id: "admin", label: "Super Admin", icon: User },
  { id: "done", label: "Selesai", icon: CheckCircle2 },
] as const;

type StepId = (typeof STEPS)[number]["id"];

function statusBadge(status: RequirementCheck["status"]) {
  if (status === "ok") return <Badge variant="default">OK</Badge>;
  if (status === "warn") return <Badge variant="secondary">Info</Badge>;
  return <Badge variant="destructive">Gagal</Badge>;
}

export function InstallerWizard({ initialDatabaseUrl }: { initialDatabaseUrl: string }) {
  const router = useRouter();
  const [step, setStep] = useState<StepId>("requirements");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [checks, setChecks] = useState<RequirementCheck[]>([]);
  const [blocking, setBlocking] = useState(true);

  const [databaseUrl, setDatabaseUrl] = useState(initialDatabaseUrl);
  const [authSecret, setAuthSecret] = useState("");
  const [appUrl, setAppUrl] = useState("");
  const [appTimezone, setAppTimezone] = useState("Asia/Jakarta");
  const [cronSecret, setCronSecret] = useState("");

  const [schemaDone, setSchemaDone] = useState(false);
  const [dataMode, setDataMode] = useState<DataSourceMode>("fresh");
  const [sqlitePreview, setSqlitePreview] = useState<{ name: string; rows: number }[] | null>(null);
  const [migrationSummary, setMigrationSummary] = useState<string | null>(null);
  const [superadminEmails, setSuperadminEmails] = useState<string[]>([]);
  const [dataDone, setDataDone] = useState(false);

  const [adminNama, setAdminNama] = useState("Super Admin");
  const [adminEmail, setAdminEmail] = useState("super@netmanage.app");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [loginUrl, setLoginUrl] = useState("/login");

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  const loadRequirements = useCallback((url?: string) => {
    startTransition(async () => {
      setError(null);
      const res = await checkRequirementsAction(url);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setChecks(res.data!.checks);
      setBlocking(res.data!.blocking);
    });
  }, []);

  useEffect(() => {
    loadRequirements(databaseUrl || undefined);
  }, [loadRequirements, databaseUrl]);

  useEffect(() => {
    if (!authSecret) {
      generateAuthSecretAction().then((res) => {
        if (res.ok) setAuthSecret(res.data!.secret);
      });
    }
  }, [authSecret]);

  function goNext() {
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next.id);
  }

  function goBack() {
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev.id);
  }

  function handleSaveEnv() {
    startTransition(async () => {
      setError(null);
      const res = await saveInstallEnvAction({
        databaseUrl,
        authSecret,
        appUrl,
        appTimezone,
        cronSecret: cronSecret || undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      goNext();
    });
  }

  function handleRunSchema() {
    startTransition(async () => {
      setError(null);
      const res = await runSchemaMigrationAction(databaseUrl);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSchemaDone(true);
      goNext();
    });
  }

  function handleUploadSqlite(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    startTransition(async () => {
      setError(null);
      const res = await uploadSqliteBackupAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSqlitePreview(res.data!.tables.filter((t) => t.rows > 0));
    });
  }

  function handleDataSetup() {
    startTransition(async () => {
      setError(null);
      const res = await runDataSetupAction(databaseUrl, dataMode);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDataDone(true);
      setSuperadminEmails(res.data!.superadminEmails);
      if (res.data!.migration) {
        setMigrationSummary(`${res.data!.migration.totalRows} baris dimigrasi`);
      }
      if (res.data!.superadminCount > 0) {
        const email = res.data!.superadminEmails[0] ?? adminEmail;
        await finishInstall(email);
      } else {
        goNext();
      }
    });
  }

  function handleCreateAdmin() {
    startTransition(async () => {
      setError(null);
      const res = await createSuperadminAction(databaseUrl, {
        nama: adminNama,
        email: adminEmail,
        password: adminPassword,
        phone: adminPhone || undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSuperadminEmails([res.data!.email]);
      await finishInstall(res.data!.email);
    });
  }

  async function finishInstall(email: string) {
    const res = await finishInstallAction(databaseUrl, email);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setLoginUrl(res.data!.loginUrl);
    setStep("done");
  }

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center justify-center gap-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const active = s.id === step;
          const done = i < stepIndex;
          return (
            <div
              key={s.id}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${
                active
                  ? "bg-primary text-primary-foreground"
                  : done
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {done ? <CheckCircle2 className="size-3.5" /> : <Icon className="size-3.5" />}
              {s.label}
            </div>
          );
        })}
      </nav>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {step === "requirements" && (
        <Card>
          <CardHeader>
            <CardTitle>Pemeriksaan requirement</CardTitle>
            <CardDescription>
              Pastikan server memenuhi kebutuhan aplikasi sebelum melanjutkan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="divide-y rounded-md border">
              {checks.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium">{c.label}</p>
                    <p className="text-xs text-muted-foreground">{c.detail}</p>
                  </div>
                  {statusBadge(c.status)}
                </li>
              ))}
              {checks.length === 0 && pending && (
                <li className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Memeriksa…
                </li>
              )}
            </ul>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => loadRequirements(databaseUrl || undefined)} disabled={pending}>
                Periksa ulang
              </Button>
              <Button type="button" onClick={goNext} disabled={blocking || pending}>
                Lanjut <ChevronRight />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "env" && (
        <Card>
          <CardHeader>
            <CardTitle>Environment &amp; database</CardTitle>
            <CardDescription>
              Konfigurasi PostgreSQL dan secret aplikasi. File <code className="text-xs">.env</code>{" "}
              akan ditulis di server.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="databaseUrl">DATABASE_URL (PostgreSQL)</Label>
              <Input
                id="databaseUrl"
                value={databaseUrl}
                onChange={(e) => setDatabaseUrl(e.target.value)}
                placeholder="postgresql://user:pass@localhost:5432/netmanage"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="authSecret">AUTH_SECRET</Label>
              <div className="flex gap-2">
                <Input
                  id="authSecret"
                  value={authSecret}
                  onChange={(e) => setAuthSecret(e.target.value)}
                  autoComplete="off"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    generateAuthSecretAction().then((r) => r.ok && setAuthSecret(r.data!.secret))
                  }
                >
                  Acak
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="appUrl">NEXT_PUBLIC_APP_URL</Label>
              <Input
                id="appUrl"
                value={appUrl}
                onChange={(e) => setAppUrl(e.target.value)}
                placeholder="https://isp.tunnelhost.my.id"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tz">APP_TIMEZONE</Label>
                <Input id="tz" value={appTimezone} onChange={(e) => setAppTimezone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cron">CRON_SECRET (opsional)</Label>
                <Input id="cron" value={cronSecret} onChange={(e) => setCronSecret(e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Driver SQLite diabaikan — instalasi ini khusus PostgreSQL. Setelah selesai, restart
              PM2 agar env baru terbaca.
            </p>
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={goBack}>
                <ChevronLeft /> Kembali
              </Button>
              <Button type="button" onClick={handleSaveEnv} disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : null}
                Simpan &amp; lanjut
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "schema" && (
        <Card>
          <CardHeader>
            <CardTitle>Migrasi schema PostgreSQL</CardTitle>
            <CardDescription>
              Menjalankan <code className="text-xs">drizzle-kit migrate</code> untuk membuat tabel
              di database kosong.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {schemaDone && (
              <p className="text-sm text-primary">Schema sudah diterapkan.</p>
            )}
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={goBack}>
                <ChevronLeft /> Kembali
              </Button>
              <Button type="button" onClick={handleRunSchema} disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : null}
                Jalankan migrasi schema
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "data" && (
        <Card>
          <CardHeader>
            <CardTitle>Sumber data</CardTitle>
            <CardDescription>
              Instalasi baru atau impor backup SQLite production (termasuk pelanggan semua tenant).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setDataMode("fresh")}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  dataMode === "fresh" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                }`}
              >
                <p className="font-medium">Instalasi baru</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Paket SaaS default + platform settings. Tanpa data tenant.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setDataMode("sqlite")}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  dataMode === "sqlite" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                }`}
              >
                <p className="font-medium">Migrasi dari SQLite</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Upload file <code>.db</code> backup — pelanggan, tagihan, tenant, dll.
                </p>
              </button>
            </div>

            {dataMode === "sqlite" && (
              <div className="space-y-3 rounded-md border p-4">
                <Label htmlFor="sqliteFile">File backup SQLite (.db)</Label>
                <Input id="sqliteFile" type="file" accept=".db" onChange={handleUploadSqlite} />
                {sqlitePreview && sqlitePreview.length > 0 && (
                  <ul className="max-h-40 overflow-y-auto text-xs text-muted-foreground">
                    {sqlitePreview.map((t) => (
                      <li key={t.name}>
                        {t.name}: {t.rows} baris
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {dataDone && migrationSummary && (
              <p className="text-sm text-primary">{migrationSummary}</p>
            )}

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={goBack}>
                <ChevronLeft /> Kembali
              </Button>
              <Button
                type="button"
                onClick={handleDataSetup}
                disabled={pending || (dataMode === "sqlite" && !sqlitePreview)}
              >
                {pending ? <Loader2 className="animate-spin" /> : null}
                {dataMode === "fresh" ? "Siapkan data awal" : "Migrasi ke PostgreSQL"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "admin" && (
        <Card>
          <CardHeader>
            <CardTitle>Akun Super Admin</CardTitle>
            <CardDescription>
              Akun platform untuk mengelola tenant, paket SaaS, dan deploy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nama">Nama</Label>
              <Input id="nama" value={adminNama} onChange={(e) => setAdminNama(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telepon (opsional)</Label>
              <Input id="phone" value={adminPhone} onChange={(e) => setAdminPhone(e.target.value)} />
            </div>
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={goBack}>
                <ChevronLeft /> Kembali
              </Button>
              <Button type="button" onClick={handleCreateAdmin} disabled={pending || adminPassword.length < 8}>
                {pending ? <Loader2 className="animate-spin" /> : null}
                Buat &amp; selesai
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "done" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <CheckCircle2 /> Instalasi selesai
            </CardTitle>
            <CardDescription>
              Restart PM2 agar environment dan koneksi database baru aktif.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {superadminEmails.length > 0 && (
              <p className="text-sm">
                Super Admin:{" "}
                <strong>{superadminEmails.join(", ")}</strong>
              </p>
            )}
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>
                <code>pm2 restart billingisp</code>
              </li>
              <li>Buka halaman login dan masuk sebagai Super Admin</li>
              <li>Hapus atau blokir route <code>/install</code> jika perlu (lock file sudah dibuat)</li>
            </ol>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => router.push(loginUrl)}>
                Ke halaman login
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
